using System.Text;
using System.IO;

namespace StarbreakersNet.HardwareMonitor.Lib
{
    public class SystemInfoWriter : BinaryWriter
    {
        public SystemInfoWriter(Stream input) : base(input, Encoding.UTF8)
        { }

        public void Write(in SystemConfig config)
        {
            Write(config.cpuCount);
            for (int i = 0; i < config.cpuCount; i++)
                Write(config.cpuNames[i]);
            for (int i = 0; i < config.cpuCount; i++)
                Write(config.cpuCoreCount[i]);

            Write(config.gpuCount);
            for (int i = 0; i < config.gpuCount; i++)
                Write(config.gpuNames[i]);
        }

        public void Write(in SystemInfos infos)
        {
            Write(infos.cpuInfos.Length);
            for (int i = 0; i < infos.cpuInfos.Length; i++)
                Write(infos.cpuInfos[i]);

            Write(infos.gpuInfos.Length);
            for (int i = 0; i < infos.gpuInfos.Length; i++)
                Write(infos.gpuInfos[i]);
            
            Write(infos.memoryInfos);
        }

        public void Write(in MemoryInfos memoryInfos)
        {
            Write(memoryInfos.load);
            Write(memoryInfos.usedMemory);
            Write(memoryInfos.availableMemory);
        }

        public void Write(in GPUInfos gpuInfos)
        {
            Write(gpuInfos.clock);
            Write(gpuInfos.temperature);
            Write(gpuInfos.load);
            Write(gpuInfos.fanSpeed);
            Write(gpuInfos.fanControl);
            Write(gpuInfos.memoryFree);
            Write(gpuInfos.memoryUsed);
            Write(gpuInfos.memoryTotal);
        }

        public void Write(in CPUInfos cpuInfos)
        {
            Write(cpuInfos.busSpeed);
            Write(cpuInfos.temperature);
            Write(cpuInfos.load);
            Write(cpuInfos.cores.Length);
            for (int i = 0; i < cpuInfos.cores.Length; i++)
                Write(cpuInfos.cores[i]);
        }

        public void Write(in CPUCore cpuCore)
        {
            Write(cpuCore.clock);
            Write(cpuCore.temperature);
            Write(cpuCore.load);
        }
    }
}
