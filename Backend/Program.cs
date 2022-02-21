using System;
using System.IO;
using System.IO.Pipes;
using System.Threading.Tasks;

namespace StarbreakersNet.HardwareMonitor.Backend
{
    internal class Program
    {
        static int updateDelay;
        static async Task ReadWaitTime(NamedPipeClientStream pipeClient)
        {
            var array = new byte[sizeof(int)];
            while (true)
            {
                int read = await pipeClient.ReadAsync(array, 0, array.Length);
                if (read != array.Length)
                    break;

                updateDelay = BitConverter.ToInt32(array, 0);
                Console.WriteLine($"Receive new update delay of {updateDelay} ms");
            }
        }

        static void Client()
        {
            var infos = new SystemInfos();
            var pipeClient = new NamedPipeClientStream(".", Lib.ServerClientConfig.Name,
                        PipeDirection.InOut, Lib.ServerClientConfig.ClientOptions,
                        Lib.ServerClientConfig.TokenImpersonationLevel);

            pipeClient.Connect();

            var reader = new Lib.SystemInfoReader(pipeClient);
            var writer = new Lib.SystemInfoWriter(pipeClient);

            var key = reader.ReadString();
            Console.WriteLine(key);
            if (key == Lib.ServerClientConfig.IdentificationKey)
            {
                updateDelay = reader.ReadInt32();
                writer.Write(infos.Config);
                ReadWaitTime(pipeClient);
                while (true)
                {
                    infos.UpdateSystemInfos();
                    try
                    {
                        writer.Write(infos.Infos);
                    }
                    catch
                    {
                        break;
                    }
                    System.Threading.Thread.Sleep(updateDelay);
                }
            }
        }

        static void Main(string[] args)
        {
            Client();
        }
    }
}
