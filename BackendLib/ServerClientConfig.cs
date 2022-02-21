using System.IO.Pipes;
using System.Security.Principal;

namespace StarbreakersNet.HardwareMonitor.Lib
{
    public static class ServerClientConfig
    {
        public static string IdentificationKey = "StarbreakersNet Hardware Monitor Pipe Key";
        public static string Name = "StarbreakersNet Pipe";
        public static PipeTransmissionMode TransmissionMode = PipeTransmissionMode.Byte;
        public static PipeOptions ClientOptions = PipeOptions.Asynchronous;
        public static PipeOptions ServerOptions = PipeOptions.None;
        public static TokenImpersonationLevel TokenImpersonationLevel = TokenImpersonationLevel.Impersonation;
    }
}
