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
using OpenHardwareMonitor.Hardware;
using System.Diagnostics;

namespace StarbreakersNet_Hardware_Monitor
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public class UpdateVisitor : IVisitor
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
        float cpu_temp;
        string cpu_name;
        float gpu_temp;
        string gpu_name;

        Task task;
        Computer computer;
        UpdateVisitor updateVisitor;

        void GetSystemInfo()
        {
            computer.Accept(updateVisitor);
            for (int i = 0; i < computer.Hardware.Length; i++)
            {
                if (computer.Hardware[i].HardwareType == HardwareType.CPU)
                {
                    //Trace.WriteLine("HardwareType.CPU " + computer.Hardware[i].Sensors.Length);
                    for (int j = 0; j < computer.Hardware[i].Sensors.Length; j++)
                    {
                        if (computer.Hardware[i].Sensors[j].SensorType == SensorType.Temperature)
                        {
                            //Trace.WriteLine(computer.Hardware[i].Sensors[j].Name + " " + computer.Hardware[i].Sensors[j].Identifier);
                            cpu_temp = computer.Hardware[i].Sensors[j].Value.Value;
                            cpu_name = computer.Hardware[i].Sensors[j].Name;
                        }
                    }
                }
                else if (computer.Hardware[i].HardwareType == HardwareType.GpuNvidia)
                {
                    //Trace.WriteLine("HardwareType.GpuNvidia " + computer.Hardware[i].Sensors.Length);
                    for (int j = 0; j < computer.Hardware[i].Sensors.Length; j++)
                    {
                        if (computer.Hardware[i].Sensors[j].SensorType == SensorType.Temperature)
                        {
                            //Trace.WriteLine(computer.Hardware[i].Sensors[j].Name + " " + computer.Hardware[i].Sensors[j].Identifier);
                            gpu_temp = computer.Hardware[i].Sensors[j].Value.Value;
                            gpu_name = computer.Hardware[i].Sensors[j].Name;
                        }
                    }
                }
            }
        }

        void InitOpenHardwareMonitor()
        {
            updateVisitor = new UpdateVisitor();
            computer = new Computer();
            computer.Open();
            computer.CPUEnabled = true;
            computer.GPUEnabled = true;
        }

        public MainWindow()
        {
            InitializeComponent();
            InitOpenHardwareMonitor();

            task = new Task(() =>
            {
                while (true)
                {
                    System.Threading.Thread.Sleep(1000);
                    GetSystemInfo();

                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        label_CPU.Content = $"{cpu_name} = {cpu_temp} °C";
                        label_GPU.Content = $"{gpu_name} = {gpu_temp} °C";
                    });
                }
            });
            task.Start();
        }

        ~MainWindow()
        {
            computer.Close();
        }
    }
}
