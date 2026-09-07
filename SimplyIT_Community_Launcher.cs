using System;
using System.IO;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Threading;
using System.Net.Sockets;
using System.Text.RegularExpressions;

namespace SimplyITCommunityLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        private static void LogTrace(string msg)
        {
            try
            {
                string p = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launcher_trace.log");
                File.AppendAllText(p, DateTime.Now.ToString("HH:mm:ss.fff") + " " + msg + "\r\n");
            }
            catch {}
        }

        private Label lblTitle;
        private Label lblSubtitle;
        private Panel pnlHeader;
        private Panel pnlStatus;
        private Label lblStatus;
        private ProgressBar progressBar;
        private TextBox txtLogs;
        private Button btnLaunchBrowser;
        private Button btnHideToTray;
        private Button btnRestart;
        private Button btnStopExit;
        private NotifyIcon trayIcon;
        private Process serverProcess;
        private System.Windows.Forms.Timer pollTimer;
        private System.Windows.Forms.Timer autoHideTimer;
        private string appDir;
        private string targetUrl = "http://localhost:3001";
        private int targetPort = 3001;
        private bool isServerRunning = false;
        private bool isStarting = false;
        private bool isExplicitExit = false;

        public MainForm()
        {
            InitializeComponent();
            LocateAppDir();
            StartCompleteStack();
        }

        private void InitializeComponent()
        {
            this.Text = "SIMPLY IT - One platform. Simple IT. (Community Edition)";
            this.Size = new Size(580, 570);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // Load app icon
            string icoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
            if (!File.Exists(icoPath))
            {
                icoPath = @"F:\OneDrive - GELEX\Documents\GitHub\Simply-it-community\app.ico";
            }
            if (File.Exists(icoPath))
            {
                try { this.Icon = new Icon(icoPath); } catch {}
            }

            // Header Panel with Dark Navy #0A1A2F
            pnlHeader = new Panel();
            pnlHeader.Location = new Point(0, 0);
            pnlHeader.Size = new Size(580, 84);
            pnlHeader.BackColor = Color.FromArgb(10, 26, 47);
            this.Controls.Add(pnlHeader);

            // Logo PictureBox
            PictureBox picIcon = new PictureBox();
            picIcon.Location = new Point(20, 14);
            picIcon.Size = new Size(56, 56);
            picIcon.SizeMode = PictureBoxSizeMode.Zoom;
            picIcon.BackColor = Color.Transparent;

            string logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "public", "logo.png");
            if (!File.Exists(logoPath))
            {
                logoPath = @"F:\OneDrive - GELEX\Documents\GitHub\Simply-it-community\public\logo.png";
            }

            if (File.Exists(logoPath))
            {
                try {
                    byte[] bytes = File.ReadAllBytes(logoPath);
                    using (MemoryStream ms = new MemoryStream(bytes))
                    {
                        picIcon.Image = Image.FromStream(ms);
                    }
                }
                catch { picIcon.Image = SystemIcons.Shield.ToBitmap(); }
            }
            else
            {
                picIcon.Image = SystemIcons.Shield.ToBitmap();
            }
            pnlHeader.Controls.Add(picIcon);

            lblTitle = new Label();
            lblTitle.Text = "SIMPLY IT";
            lblTitle.Font = new Font("Segoe UI", 15F, FontStyle.Bold);
            lblTitle.ForeColor = Color.White;
            lblTitle.Location = new Point(86, 14);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            lblSubtitle = new Label();
            lblSubtitle.Text = "Do Less – Achieve More (Community Edition Server)";
            lblSubtitle.Font = new Font("Segoe UI", 8.5F);
            lblSubtitle.ForeColor = Color.FromArgb(0, 184, 212);
            lblSubtitle.Location = new Point(88, 44);
            lblSubtitle.AutoSize = true;
            pnlHeader.Controls.Add(lblSubtitle);

            // Status Panel with Soft Blue #E3F2FD
            pnlStatus = new Panel();
            pnlStatus.Location = new Point(20, 98);
            pnlStatus.Size = new Size(525, 72);
            pnlStatus.BackColor = Color.FromArgb(227, 242, 253);
            pnlStatus.Paint += (s, e) => {
                ControlPaint.DrawBorder(e.Graphics, pnlStatus.ClientRectangle, Color.FromArgb(144, 202, 249), ButtonBorderStyle.Solid);
            };
            this.Controls.Add(pnlStatus);

            lblStatus = new Label();
            lblStatus.Text = "⏳ Đang giải phóng cổng & nạp cơ sở dữ liệu PostgreSQL...";
            lblStatus.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblStatus.ForeColor = Color.FromArgb(13, 71, 161);
            lblStatus.Location = new Point(15, 12);
            lblStatus.Size = new Size(495, 24);
            pnlStatus.Controls.Add(lblStatus);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(15, 42);
            progressBar.Size = new Size(495, 14);
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 30;
            pnlStatus.Controls.Add(progressBar);

            // Log Label
            Label lblLogTitle = new Label();
            lblLogTitle.Text = "Nhật ký tiến trình máy chủ (Realtime Logs):";
            lblLogTitle.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            lblLogTitle.ForeColor = Color.FromArgb(71, 85, 105);
            lblLogTitle.Location = new Point(20, 180);
            lblLogTitle.AutoSize = true;
            this.Controls.Add(lblLogTitle);

            txtLogs = new TextBox();
            txtLogs.Location = new Point(20, 202);
            txtLogs.Size = new Size(525, 195);
            txtLogs.Multiline = true;
            txtLogs.ReadOnly = true;
            txtLogs.ScrollBars = ScrollBars.Vertical;
            txtLogs.BackColor = Color.FromArgb(10, 26, 47);
            txtLogs.ForeColor = Color.FromArgb(226, 232, 240);
            txtLogs.Font = new Font("Consolas", 8.5F);
            this.Controls.Add(txtLogs);

            // Action Buttons
            btnLaunchBrowser = new Button();
            btnLaunchBrowser.Text = "🌐 Mở Giao Diện SIMPLY IT (http://localhost:3001)";
            btnLaunchBrowser.Location = new Point(20, 408);
            btnLaunchBrowser.Size = new Size(525, 42);
            btnLaunchBrowser.BackColor = Color.FromArgb(25, 118, 210);
            btnLaunchBrowser.ForeColor = Color.White;
            btnLaunchBrowser.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            btnLaunchBrowser.FlatStyle = FlatStyle.Flat;
            btnLaunchBrowser.FlatAppearance.BorderSize = 0;
            btnLaunchBrowser.Cursor = Cursors.Hand;
            btnLaunchBrowser.Enabled = false;
            btnLaunchBrowser.Click += (s, e) => {
                try { Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true }); } catch {}
            };
            this.Controls.Add(btnLaunchBrowser);

            // Hide to Tray Button
            btnHideToTray = new Button();
            btnHideToTray.Text = "📥 Ẩn Xuống Khay";
            btnHideToTray.Location = new Point(20, 458);
            btnHideToTray.Size = new Size(165, 36);
            btnHideToTray.BackColor = Color.FromArgb(224, 242, 254);
            btnHideToTray.ForeColor = Color.FromArgb(3, 105, 161);
            btnHideToTray.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnHideToTray.FlatStyle = FlatStyle.Flat;
            btnHideToTray.FlatAppearance.BorderColor = Color.FromArgb(186, 230, 253);
            btnHideToTray.Cursor = Cursors.Hand;
            btnHideToTray.Click += (s, e) => HideToTray();
            this.Controls.Add(btnHideToTray);

            // Restart Button
            btnRestart = new Button();
            btnRestart.Text = "🔄 Khởi Động Lại";
            btnRestart.Location = new Point(195, 458);
            btnRestart.Size = new Size(170, 36);
            btnRestart.BackColor = Color.FromArgb(241, 245, 249);
            btnRestart.ForeColor = Color.FromArgb(51, 65, 85);
            btnRestart.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnRestart.FlatStyle = FlatStyle.Flat;
            btnRestart.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnRestart.Cursor = Cursors.Hand;
            btnRestart.Click += (s, e) => {
                StopServer();
                AppendLog("Khởi động lại toàn bộ hệ thống...");
                StartCompleteStack();
            };
            this.Controls.Add(btnRestart);

            // Stop / Exit Button
            btnStopExit = new Button();
            btnStopExit.Text = "🛑 Dừng & Thoát";
            btnStopExit.Location = new Point(375, 458);
            btnStopExit.Size = new Size(170, 36);
            btnStopExit.BackColor = Color.FromArgb(254, 226, 226);
            btnStopExit.ForeColor = Color.FromArgb(153, 27, 27);
            btnStopExit.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnStopExit.FlatStyle = FlatStyle.Flat;
            btnStopExit.FlatAppearance.BorderColor = Color.FromArgb(254, 202, 202);
            btnStopExit.Cursor = Cursors.Hand;
            btnStopExit.Click += (s, e) => {
                isExplicitExit = true;
                this.Close();
            };
            this.Controls.Add(btnStopExit);

            // System Tray Icon
            trayIcon = new NotifyIcon();
            trayIcon.Text = "SIMPLY IT Community (Đang Chạy Ngầm)";
            if (this.Icon != null) trayIcon.Icon = this.Icon;
            else trayIcon.Icon = SystemIcons.Shield;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => RestoreFromTray();

            ContextMenu trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("🌐 Mở Giao Diện SIMPLY IT", (s, e) => {
                try { Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true }); } catch {}
            });
            trayMenu.MenuItems.Add("🖥️ Hiện Cửa Sổ Máy Chủ", (s, e) => RestoreFromTray());
            trayMenu.MenuItems.Add("🔄 Khởi Động Lại Hệ Thống", (s, e) => {
                StopServer();
                AppendLog("Khởi động lại toàn bộ hệ thống...");
                StartCompleteStack();
            });
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("🛑 Dừng & Thoát Hoàn Toàn", (s, e) => {
                isExplicitExit = true;
                this.Close();
            });
            trayIcon.ContextMenu = trayMenu;

            // Intercept close button [X]: minimize to tray instead of quitting unexpectedly
            this.FormClosing += (s, e) => {
                LogTrace("FormClosing: reason=" + e.CloseReason + ", isExplicitExit=" + isExplicitExit);
                if (!isExplicitExit && e.CloseReason == CloseReason.UserClosing)
                {
                    e.Cancel = true;
                    HideToTray();
                }
                else
                {
                    StopServer();
                    trayIcon.Visible = false;
                }
            };

            // Polling timer
            pollTimer = new System.Windows.Forms.Timer();
            pollTimer.Interval = 1000;
            pollTimer.Tick += (s, e) => CheckServerStatus();
        }

        private void HideToTray()
        {
            this.Hide();
            try
            {
                trayIcon.ShowBalloonTip(2000, "SIMPLY IT", "Máy chủ đang chạy ngầm. Double-click icon chữ S ở góc phải thanh Taskbar để mở lại bất kỳ lúc nào.", ToolTipIcon.Info);
            }
            catch {}
        }

        private void RestoreFromTray()
        {
            this.Show();
            this.WindowState = FormWindowState.Normal;
            this.BringToFront();
            this.Activate();
        }

        private void LocateAppDir()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (File.Exists(Path.Combine(baseDir, "package.json")))
            {
                appDir = baseDir;
                return;
            }

            string userRepo = @"F:\OneDrive - GELEX\Documents\GitHub\Simply-it-community";
            if (Directory.Exists(userRepo) && File.Exists(Path.Combine(userRepo, "package.json")))
            {
                appDir = userRepo;
                return;
            }

            string scratch = @"C:\Users\kien.ta-trung\.gemini\antigravity\scratch\simply-it-community";
            if (Directory.Exists(scratch) && File.Exists(Path.Combine(scratch, "package.json")))
            {
                appDir = scratch;
                return;
            }

            appDir = baseDir;
        }

        private void AppendLog(string message)
        {
            if (this.IsDisposed) return;
            if (this.InvokeRequired)
            {
                try { this.BeginInvoke(new Action<string>(AppendLog), message); } catch {}
                return;
            }
            string time = DateTime.Now.ToString("HH:mm:ss");

            // Prevent UI freeze caused by rich text buffer overflow
            if (txtLogs.TextLength > 25000)
            {
                txtLogs.Text = txtLogs.Text.Substring(10000);
            }
            txtLogs.AppendText(string.Format("[{0}] {1}\r\n", time, message));
        }

        private void UpdateStatusText(string text)
        {
            if (this.IsDisposed) return;
            if (this.InvokeRequired)
            {
                try { this.BeginInvoke(new Action<string>(UpdateStatusText), text); } catch {}
                return;
            }
            lblStatus.Text = text;
        }

        private bool IsPortOpen(int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    var result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(300);
                    if (!success) return false;
                    client.EndConnect(result);
                    return true;
                }
            }
            catch { return false; }
        }

        private void CleanupPortProcess(int port)
        {
            try
            {
                Process p = new Process();
                p.StartInfo.FileName = "cmd.exe";
                p.StartInfo.Arguments = "/c for /f \"tokens=5\" %a in ('netstat -aon ^| find \":" + port + "\" ^| find \"LISTENING\"') do taskkill /F /PID %a";
                p.StartInfo.CreateNoWindow = true;
                p.StartInfo.UseShellExecute = false;
                p.Start();
                p.WaitForExit(1500);
            }
            catch {}
        }

        private void ResetUiToStarting()
        {
            if (this.InvokeRequired)
            {
                try { this.BeginInvoke(new Action(ResetUiToStarting)); } catch {}
                return;
            }
            pnlStatus.BackColor = Color.FromArgb(227, 242, 253);
            lblStatus.Text = "⏳ Đang giải phóng cổng & nạp cơ sở dữ liệu PostgreSQL...";
            lblStatus.ForeColor = Color.FromArgb(13, 71, 161);
            progressBar.Style = ProgressBarStyle.Marquee;
            btnLaunchBrowser.Enabled = false;
            btnLaunchBrowser.BackColor = Color.FromArgb(25, 118, 210);
            btnLaunchBrowser.ForeColor = Color.White;
            btnLaunchBrowser.Text = "🌐 Mở Giao Diện SIMPLY IT (http://localhost:3001)";
        }

        private void StartCompleteStack()
        {
            if (isStarting) return;
            isStarting = true;
            isServerRunning = false;
            ResetUiToStarting();

            Thread t = new Thread(() => {
                try
                {
                    AppendLog("Bắt đầu quy trình kiểm tra và nạp hệ thống SIMPLY IT...");

                    // 1. Clean conflicting port 3001
                    AppendLog("1/3 Đang kiểm tra và giải phóng cổng " + targetPort + "...");
                    CleanupPortProcess(targetPort);

                    // 2. Ensure PostgreSQL service
                    UpdateStatusText("⏳ [1/3] Đang kiểm tra dịch vụ CSDL PostgreSQL...");
                    AppendLog("2/3 Kiểm tra dịch vụ CSDL PostgreSQL trên cổng 5432...");
                    EnsurePostgreSql();

                    // 3. Launch Next.js production server
                    LaunchNextJs();
                }
                finally
                {
                    isStarting = false;
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        private void EnsurePostgreSql()
        {
            try
            {
                if (IsPortOpen(5432))
                {
                    AppendLog("✅ Cơ sở dữ liệu PostgreSQL đã sẵn sàng trên cổng 5432.");
                    return;
                }

                string[] serviceNames = new string[] { "postgresql-x64-18", "postgresql-x64-16", "postgresql-x64-15", "postgresql" };
                foreach (string svc in serviceNames)
                {
                    try
                    {
                        AppendLog("Khởi động dịch vụ " + svc + "...");
                        Process p = Process.Start(new ProcessStartInfo("net", "start " + svc) {
                            CreateNoWindow = true,
                            UseShellExecute = false,
                            RedirectStandardOutput = true
                        });
                        if (p != null) p.WaitForExit(3000);
                        if (IsPortOpen(5432)) break;
                    }
                    catch {}
                }

                int attempts = 0;
                while (!IsPortOpen(5432) && attempts < 8)
                {
                    Thread.Sleep(500);
                    attempts++;
                }

                if (IsPortOpen(5432))
                {
                    AppendLog("✅ Kết nối PostgreSQL thành công!");
                }
                else
                {
                    AppendLog("⚠️ Chưa thấy PostgreSQL phản hồi trên port 5432, tiếp tục chạy Web Server...");
                }
            }
            catch (Exception ex)
            {
                AppendLog("Lỗi kiểm tra PostgreSQL: " + ex.Message);
            }
        }

        private void LaunchNextJs()
        {
            try
            {
                UpdateStatusText("⏳ [2/3] Đang khởi động Web Server SIMPLY IT (Chế độ Production Siêu Tốc)...");
                AppendLog("🚀 [2/3] Bắt đầu chạy Web Server Production...");

                ProcessStartInfo psi = new ProcessStartInfo();
                string nodeExe = @"C:\Program Files\nodejs\node.exe";
                if (!File.Exists(nodeExe))
                {
                    nodeExe = "node";
                }
                psi.FileName = nodeExe;
                psi.Arguments = "--max-old-space-size=4096 server.js";
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

                // Ensure PATH has common node directories
                string currentPath = Environment.GetEnvironmentVariable("PATH") ?? "";
                string nodeDir = @"C:\Program Files\nodejs";
                if (!currentPath.Contains(nodeDir) && Directory.Exists(nodeDir))
                {
                    psi.EnvironmentVariables["PATH"] = nodeDir + ";" + currentPath;
                }

                serverProcess = new Process();
                serverProcess.StartInfo = psi;
                serverProcess.OutputDataReceived += (s, e) => {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        AppendLog(e.Data);
                        ParseServerUrl(e.Data);
                    }
                };
                serverProcess.ErrorDataReceived += (s, e) => {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        AppendLog("[LOG] " + e.Data);
                        ParseServerUrl(e.Data);
                    }
                };

                serverProcess.Start();
                serverProcess.BeginOutputReadLine();
                serverProcess.BeginErrorReadLine();

                // Start polling timer now that process is running
                if (this.InvokeRequired)
                {
                    this.BeginInvoke(new Action(() => pollTimer.Start()));
                }
                else
                {
                    pollTimer.Start();
                }
            }
            catch (Exception ex)
            {
                AppendLog("Lỗi khi khởi động Web Server: " + ex.Message);
            }
        }

        private void ParseServerUrl(string line)
        {
            try
            {
                Match m = Regex.Match(line, @"Local:\s*(http://localhost:(\d+))");
                if (m.Success)
                {
                    targetUrl = m.Groups[1].Value;
                    int p;
                    if (int.TryParse(m.Groups[2].Value, out p))
                    {
                        targetPort = p;
                    }
                }
            }
            catch {}
        }

        private void CheckServerStatus()
        {
            if (isServerRunning) return;

            if (serverProcess != null && serverProcess.HasExited)
            {
                AppendLog("❌ Máy chủ Node.js đã dừng (Mã lỗi: " + serverProcess.ExitCode + ").");
                pollTimer.Stop();
                return;
            }

            bool isSqlUp = IsPortOpen(5432);
            bool isWebUp = IsPortOpen(targetPort);

            if (isSqlUp && isWebUp)
            {
                isServerRunning = true;
                pollTimer.Stop();
                OnServerReady();
            }
            else if (!isSqlUp && isWebUp)
            {
                UpdateStatusText("⚠️ Web đã chạy nhưng SQL (Port 5432) chưa kết nối!");
            }
            else if (isSqlUp && !isWebUp)
            {
                UpdateStatusText("⏳ [2/3] SQL OK. Đang nạp Web Server (Port " + targetPort + ")...");
            }
        }

        private void OnServerReady()
        {
            if (this.IsDisposed) return;
            if (this.InvokeRequired)
            {
                try { this.BeginInvoke(new Action(OnServerReady)); } catch {}
                return;
            }

            pnlStatus.BackColor = Color.FromArgb(227, 242, 253);
            lblStatus.Text = "✅ [3/3] Toàn bộ hệ thống SIMPLY IT đã sẵn sàng (" + targetUrl + ")!";
            lblStatus.ForeColor = Color.FromArgb(13, 71, 161);
            progressBar.Style = ProgressBarStyle.Blocks;
            progressBar.Value = 100;

            btnLaunchBrowser.Enabled = true;
            btnLaunchBrowser.BackColor = Color.FromArgb(0, 184, 212);
            btnLaunchBrowser.ForeColor = Color.FromArgb(10, 26, 47);
            btnLaunchBrowser.Text = "🚀 MỞ GIAO DIỆN SIMPLY IT (" + targetUrl + ")";

            AppendLog("🎉 [3/3] SIMPLY IT ĐÃ SẴN SÀNG! Đang mở trình duyệt...");
            try
            {
                trayIcon.ShowBalloonTip(3000, "SIMPLY IT Sẵn Sàng", "Hệ thống đã hoạt động tại " + targetUrl + ". Cửa sổ sẽ tự ẩn xuống khay sau 3 giây.", ToolTipIcon.Info);
            }
            catch {}

            try
            {
                Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true });
            }
            catch {}

            // Auto-hide window after 3 seconds so it does not obstruct the user
            autoHideTimer = new System.Windows.Forms.Timer();
            autoHideTimer.Interval = 3000;
            autoHideTimer.Tick += (s, e) => {
                try {
                    autoHideTimer.Stop();
                    autoHideTimer.Dispose();
                    HideToTray();
                } catch {}
            };
            autoHideTimer.Start();
        }

        private void StopServer()
        {
            try
            {
                isServerRunning = false;
                if (pollTimer != null) pollTimer.Stop();
                if (autoHideTimer != null) { autoHideTimer.Stop(); autoHideTimer.Dispose(); }

                if (serverProcess != null && !serverProcess.HasExited)
                {
                    try
                    {
                        Process p = Process.Start(new ProcessStartInfo("taskkill", "/F /T /PID " + serverProcess.Id) {
                            CreateNoWindow = true,
                            UseShellExecute = false
                        });
                        if (p != null) p.WaitForExit(2000);
                    }
                    catch {}
                    serverProcess = null;
                }

                CleanupPortProcess(targetPort);
            }
            catch {}
        }
    }
}
