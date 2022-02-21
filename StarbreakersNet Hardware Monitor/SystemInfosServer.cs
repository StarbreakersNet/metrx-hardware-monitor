using System;
using System.IO;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO.Pipes;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace StarbreakersNet.HardwareMonitor
{
    internal class SystemInfosServer
    {
        private static int DefaultUpdateDelay = 1000;

        private Process m_process;
        private System.Threading.Thread m_thread;
        private NamedPipeServerStream m_pipeServer;
        private Lib.SystemInfoReader m_systemInfoReader;
        private Lib.SystemInfoWriter m_systemInfoWriter;

        private Lib.SystemConfig m_config;
        public Lib.SystemConfig SystemConfig { get { return m_config; } }

        public event Action<Lib.SystemInfos> getNewSystemInfos;

        public void Start()
        {
            m_thread = new System.Threading.Thread(StartNewServer);
            m_thread.Start();
            StartClient();
        }

        public void Stop()
        { 
            m_pipeServer.Close();
            if (m_process != null)
                m_process.Kill();
            if (m_thread != null)
                m_thread.Join();
        }

        public void WriteNewUpdateDelay(int updateDelay)
        {
            m_systemInfoWriter.Write(updateDelay);
        }

        private void StartClient()
        {
            try
            {
                m_process = new Process();
                m_process.StartInfo.UseShellExecute = false;
                m_process.StartInfo.FileName = "./Backend.exe";
                m_process.StartInfo.Arguments = "client";
                m_process.StartInfo.CreateNoWindow = true;
                m_process.Start();
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);
            }
        }

        private void StartNewServer()
        {
            m_pipeServer = new NamedPipeServerStream(Lib.ServerClientConfig.Name, PipeDirection.InOut, 1, Lib.ServerClientConfig.TransmissionMode, Lib.ServerClientConfig.ServerOptions);
            m_pipeServer.WaitForConnection();

            Trace.WriteLine("New Client connected");

            m_systemInfoReader = new Lib.SystemInfoReader(m_pipeServer);
            m_systemInfoWriter = new Lib.SystemInfoWriter(m_pipeServer);
            m_systemInfoWriter.Write(Lib.ServerClientConfig.IdentificationKey);
            m_systemInfoWriter.Write(DefaultUpdateDelay);

            try
            {
                m_config = m_systemInfoReader.ReadSystemConfig();
                while (true)
                {
                    var infos = m_systemInfoReader.ReadSystemInfos();
                    getNewSystemInfos?.Invoke(infos);
                }
            }
            catch
            { }
        }
    }
}
