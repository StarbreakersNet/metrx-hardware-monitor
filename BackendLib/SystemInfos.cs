namespace StarbreakersNet.HardwareMonitor.Lib
{
    /// <summary>
    /// CPU informations about a specific CPU Core
    /// </summary>
    public struct CPUCore
    {
        /// <summary>
        /// Core clock speed in MHz
        /// </summary>
        public float clock;

        /// <summary>
        /// Core temperature in °C
        /// </summary>
        public float temperature;

        /// <summary>
        /// Core load percentage
        /// </summary>
        public float load;
    }

    /// <summary>
    /// CPU informations
    /// </summary>
    public struct CPUInfos
    {
        /// <summary>
        /// CPU Bus Speed in MHz
        /// </summary>
        public float busSpeed;

        /// <summary>
        /// CPU temperature in °C
        /// </summary>
        public float temperature;

        /// <summary>
        /// CPU load percentage
        /// </summary>
        public float load;

        /// <summary>
        /// CPU Cores additional informations
        /// </summary>
        public CPUCore[] cores;
    }

    /// <summary>
    /// GPU informations
    /// </summary>
    public struct GPUInfos
    {
        /// <summary>
        /// GPU clock speed in MHz
        /// </summary>
        public float clock;

        /// <summary>
        /// GPU temperature in °C
        /// </summary>
        public float temperature;

        /// <summary>
        /// GPU load in percentage
        /// </summary>
        public float load;

        /// <summary>
        /// GPU fan speed in RPM
        /// </summary>
        public float fanSpeed;

        /// <summary>
        /// GPU fan speed in percentage
        /// </summary>
        public float fanControl;

        /// <summary>
        /// GPU free memory in MB
        /// </summary>
        public float memoryFree;

        /// <summary>
        /// GPU used memory in MB
        /// </summary>
        public float memoryUsed;

        /// <summary>
        /// GPU total memory in MB
        /// </summary>
        public float memoryTotal;
    }

    /*public struct MotherboardInfos
    {
        public Value[] temperatures;
        public Value[] fans;
        public Value[] fanConstrols;
    }*/

    public struct MemoryInfos
    {
        /// <summary>
        /// The percentage of used memory
        /// </summary>
        public float load;

        /// <summary>
        /// Used memory in GB
        /// </summary>
        public float usedMemory;

        /// <summary>
        /// Available memory in GB
        /// </summary>
        public float availableMemory;
    }

    public struct SystemInfos
    {
        public CPUInfos[] cpuInfos;
        public GPUInfos[] gpuInfos;
        public MemoryInfos memoryInfos;
        //public MotherboardInfos motherboardInfos;
    }

    public struct SystemConfig
    {
        public int cpuCount;
        public string[] cpuNames;
        public int[] cpuCoreCount;

        public int gpuCount;
        public string[] gpuNames;
    }
}
