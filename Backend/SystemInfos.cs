using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using OpenHardwareMonitor.Hardware;

namespace StarbreakersNet.HardwareMonitor.Backend
{
    internal class SystemInfos
    {
        private class UpdateVisitor : IVisitor
        {
            public void VisitComputer(IComputer computer)
            {
                computer.Traverse(this);
            }
            public void VisitHardware(IHardware hardware)
            {
                hardware.Update();
                foreach (IHardware subHardware in hardware.SubHardware) subHardware.Accept(this);
            }
            public void VisitSensor(ISensor sensor) { }
            public void VisitParameter(IParameter parameter) { }
        }

        private Computer m_computer;
        private UpdateVisitor m_updateVisitor;
        private Lib.SystemConfig m_systemConfig;
        private Lib.SystemInfos m_systemInfos;

        public Lib.SystemConfig Config { get { return m_systemConfig; } }
        public Lib.SystemInfos Infos { get { return m_systemInfos; } }

        public SystemInfos()
        {
            m_updateVisitor = new UpdateVisitor();
            m_computer = new Computer();
            m_computer.Open();
            m_computer.CPUEnabled = true;
            m_computer.GPUEnabled = true;
            m_computer.RAMEnabled = true;
            //computer.MainboardEnabled = true;

            CreateSystemConfig();
            CreateSystemInfos();
        }

        ~SystemInfos()
        {
            m_computer.Close();
        }

        private void CreateSystemConfig()
        {
            m_systemConfig = new Lib.SystemConfig();

            m_computer.Accept(m_updateVisitor);
            m_systemConfig.cpuCount = CountCPU();
            m_systemConfig.cpuNames = new string[m_systemConfig.cpuCount];
            m_systemConfig.cpuCoreCount = new int[m_systemConfig.cpuCount];

            m_systemConfig.gpuCount = CountGPU();
            m_systemConfig.gpuNames = new string[m_systemConfig.gpuCount];

            var cpuIndex = 0;
            var gpuIndex = 0;
            foreach (var hardware in m_computer.Hardware)
            {
                switch (hardware.HardwareType)
                {
                    case HardwareType.CPU:
                        m_systemConfig.cpuNames[cpuIndex] = hardware.Name;
                        m_systemConfig.cpuCoreCount[cpuIndex++] = CountCPUCore(hardware);
                        break;
                    case HardwareType.GpuNvidia:
                    case HardwareType.GpuAti:
                        m_systemConfig.gpuNames[gpuIndex++] = hardware.Name;
                        break;
                }
            }
        }

        private void CreateSystemInfos()
        {
            m_systemInfos = new Lib.SystemInfos();

            m_systemInfos.cpuInfos = new Lib.CPUInfos[m_systemConfig.cpuCount];
            m_systemInfos.gpuInfos = new Lib.GPUInfos[m_systemConfig.gpuCount];

            for (int i = 0; i < m_systemConfig.cpuCount; i++)
                m_systemInfos.cpuInfos[i].cores = new Lib.CPUCore[m_systemConfig.cpuCoreCount[i]];
        }

        private int CountCPUCore(IHardware cpu)
        {
            var count = 0;
            foreach (var sensor in cpu.Sensors)
            {
                if (sensor.SensorType == SensorType.Temperature)
                    count++;
            }
            return count - 1;
        }

        private int CountCPU()
        {
            var count = 0;
            foreach (var hardware in m_computer.Hardware)
            {
                if (hardware.HardwareType == HardwareType.CPU)
                    count++;
            }
            return count;
        }

        private int CountGPU()
        {
            var count = 0;
            foreach (var hardware in m_computer.Hardware)
            {
                if (hardware.HardwareType == HardwareType.GpuNvidia || hardware.HardwareType == HardwareType.GpuAti)
                    count++;
            }
            return count;
        }

        private static void GetCPUInfos(ref Lib.CPUInfos cpuInfos, IHardware cpu)
        {
            foreach (var sensor in cpu.Sensors)
            {
                switch (sensor.SensorType)
                {
                    case SensorType.Clock:
                        if (sensor.Index == 0)
                            cpuInfos.busSpeed = sensor.Value.Value;
                        else
                            cpuInfos.cores[sensor.Index - 1].clock = sensor.Value.Value;
                        break;
                    case SensorType.Temperature:
                        if (sensor.Index == cpuInfos.cores.Length)
                            cpuInfos.temperature = sensor.Value.Value;
                        else
                            cpuInfos.cores[sensor.Index].temperature = sensor.Value.Value;
                        break;
                    case SensorType.Load:
                        if (sensor.Index == 0)
                            cpuInfos.load = sensor.Value.Value;
                        else
                            cpuInfos.cores[sensor.Index - 1].load = sensor.Value.Value;
                        break;
                }
            }
        }

        private static void GetGPUInfos(ref Lib.GPUInfos gpuInfos, IHardware gpu)
        {
            foreach (var sensor in gpu.Sensors)
            {
                switch (sensor.SensorType)
                {
                    case SensorType.Clock:
                        if (sensor.Index == 0)
                            gpuInfos.clock = sensor.Value.Value;
                        break;
                    case SensorType.Temperature:
                        gpuInfos.temperature = sensor.Value.Value;
                        break;
                    case SensorType.Load:
                        if (sensor.Index == 0)
                            gpuInfos.load = sensor.Value.Value;
                        break;
                    case SensorType.Fan:
                        gpuInfos.fanSpeed = sensor.Value.Value;
                        break;
                    case SensorType.Control:
                        gpuInfos.fanControl = sensor.Value.Value;
                        break;
                    case SensorType.SmallData:
                        if (sensor.Index == 1)
                            gpuInfos.memoryFree = sensor.Value.Value;
                        else if (sensor.Index == 2)
                            gpuInfos.memoryUsed = sensor.Value.Value;
                        else if (sensor.Index == 3)
                            gpuInfos.memoryTotal = sensor.Value.Value;
                        break;
                }
            }
        }

        private static void GetMemoryInfos(ref Lib.MemoryInfos memoryInfos, IHardware memory)
        {
            foreach (var sensor in memory.Sensors)
            {
                switch (sensor.SensorType)
                {
                    case SensorType.Load:
                        memoryInfos.load = sensor.Value.Value;
                        break;
                    case SensorType.Data:
                        if (sensor.Index == 0)
                            memoryInfos.usedMemory = sensor.Value.Value;
                        else
                            memoryInfos.availableMemory = sensor.Value.Value;
                        break;
                }
            }
        }

        public void UpdateSystemInfos()
        {
            m_computer.Accept(m_updateVisitor);
            var cpuIndex = 0;
            var gpuIndex = 0;
            foreach (var hardware in m_computer.Hardware)
            {
                switch (hardware.HardwareType)
                {
                    case HardwareType.CPU:
                        GetCPUInfos(ref m_systemInfos.cpuInfos[cpuIndex++], hardware);
                        break;
                    case HardwareType.GpuNvidia:
                    case HardwareType.GpuAti:
                        GetGPUInfos(ref m_systemInfos.gpuInfos[gpuIndex++], hardware);
                        break;
                    case HardwareType.RAM:
                        GetMemoryInfos(ref m_systemInfos.memoryInfos, hardware);
                        break;
                }
            }
        }
    }
}
