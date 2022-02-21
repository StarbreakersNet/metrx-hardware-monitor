using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.Diagnostics;

namespace StarbreakersNet_Hardware_Monitor
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private StarbreakersNet.HardwareMonitor.SystemInfosServer server;

        public MainWindow()
        {
            InitializeComponent();

            server = new StarbreakersNet.HardwareMonitor.SystemInfosServer();
            server.getNewSystemInfos += infos =>
            {
                Application.Current.Dispatcher.Invoke(() =>
                {
                    label_CPU.Content = $"CPU : {infos.cpuInfos[0].temperature} °C";
                    label_GPU.Content = $"GPU : {infos.gpuInfos[0].temperature} °C";
                });
            };
            server.Start();

            Application.Current.Exit += (s, e) => { server.Stop(); };
        }
    }
}
