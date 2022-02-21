using System.Text;
using System.IO;

namespace StarbreakersNet.HardwareMonitor.Lib
{
    public class SystemInfoReader : BinaryReader
    {
        public SystemInfoReader(Stream input) : base(input, Encoding.UTF8)
        { }

        public SystemConfig ReadSystemConfig()
        {
            var config = new SystemConfig();
            config.cpuCount = ReadInt32();
            config.cpuNames = new string[config.cpuCount];
            config.cpuCoreCount = new int[config.cpuCount];
            for (int i = 0; i < config.cpuCount; i++)
                config.cpuNames[i] = ReadString();
            for (int i = 0; i < config.cpuCount; i++)
                config.cpuCoreCount[i] = ReadInt32();

            config.gpuCount = ReadInt32();
            config.gpuNames = new string[config.gpuCount];
            for (int i = 0; i < config.gpuCount; i++)
                config.gpuNames[i] = ReadString();

            return config;
        }

        public SystemInfos ReadSystemInfos()
        {
            var infos = new SystemInfos();
            infos.cpuInfos = new CPUInfos[ReadInt32()];
            for (int i = 0; i < infos.cpuInfos.Length; i++)
                infos.cpuInfos[i] = ReadCPUInfos();

            infos.gpuInfos = new GPUInfos[ReadInt32()];
            for (int i = 0; i < infos.gpuInfos.Length; i++)
                infos.gpuInfos[i] = ReadGPUInfos();

            infos.memoryInfos = ReadMemoryInfos();

            return infos;
        }

        public MemoryInfos ReadMemoryInfos()
        {
            return new MemoryInfos
            {
                load = ReadSingle(),
                usedMemory = ReadSingle(),
                availableMemory = ReadSingle()
            };
        }

        public GPUInfos ReadGPUInfos()
        {
            return new GPUInfos
            {
                clock = ReadSingle(),
                temperature = ReadSingle(),
                load = ReadSingle(),
                fanSpeed = ReadSingle(),
                fanControl = ReadSingle(),
                memoryFree = ReadSingle(),
                memoryUsed = ReadSingle(),
                memoryTotal = ReadSingle()
            };
        }

        public CPUInfos ReadCPUInfos()
        {
            var infos = new CPUInfos
            {
                busSpeed = ReadSingle(),
                temperature = ReadSingle(),
                load = ReadSingle(),
                cores = new CPUCore[ReadInt32()]
            };
            for (int i = 0; i < infos.cores.Length; i++)
                infos.cores[i] = ReadCPUCore();

            return infos;
        }

        public CPUCore ReadCPUCore()
        {
            return new CPUCore
            {
                clock = ReadSingle(),
                temperature = ReadSingle(),
                load = ReadSingle()
            };
        }
    }
}
