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
            string logFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launcher_diag.log");
            try { File.AppendAllText(logFile, "=== Launcher started at " + DateTime.Now + " ===\r\n"); } catch {}

            AppDomain.CurrentDomain.UnhandledException += (s, e) => {
                try { File.AppendAllText(logFile, "Unhandled: " + e.ExceptionObject + "\r\n"); } catch {}
            };
            Application.ThreadException += (s, e) => {
                try { File.AppendAllText(logFile, "ThreadEx: " + e.Exception + "\r\n"); } catch {}
            };

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
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
            this.Text = "SIMPLY IT - Community Edition (Máy Chủ Tự Động)";
            this.Size = new Size(580, 560);
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
            if (!File.Exists(icoPath))
            {
                icoPath = @"C:\Users\kien.ta-trung\.gemini\antigravity\scratch\simply-it-community\app.ico";
            }
            if (File.Exists(icoPath))
            {
                try { this.Icon = new Icon(icoPath); } catch {}
            }

            // Header Panel with Dark Navy #0A1A2F
            pnlHeader = new Panel();
            pnlHeader.Location = new Point(0, 0);
            pnlHeader.Size = new Size(580, 80);
            pnlHeader.BackColor = Color.FromArgb(10, 26, 47);
            this.Controls.Add(pnlHeader);

            // Header Titles
            lblTitle = new Label();
            lblTitle.Text = "SIMPLY IT — COMMUNITY EDITION";
            lblTitle.Font = new Font("Segoe UI", 13.5F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(0, 184, 212); // Cyan
            lblTitle.Location = new Point(20, 14);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            lblSubtitle = new Label();
            lblSubtitle.Text = "Hệ thống Quản lý Dịch vụ & Tài sản IT • Bản Miễn Phí Vĩnh Viễn";
            lblSubtitle.Font = new Font("Segoe UI", 8.5F, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(203, 213, 225);
            lblSubtitle.Location = new Point(22, 44);
            lblSubtitle.AutoSize = true;
            pnlHeader.Controls.Add(lblSubtitle);

            // Status Card Panel
            pnlStatus = new Panel();
            pnlStatus.Location = new Point(20, 96);
            pnlStatus.Size = new Size(525, 68);
            pnlStatus.BackColor = Color.FromArgb(254, 243, 199); // Light Amber
            pnlStatus.BorderStyle = BorderStyle.FixedSingle;
            this.Controls.Add(pnlStatus);

            lblStatus = new Label();
            lblStatus.Text = "⏳ Đang khởi động hệ thống SIMPLY IT...";
            lblStatus.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            lblStatus.ForeColor = Color.FromArgb(180, 83, 9);
            lblStatus.Location = new Point(14, 10);
            lblStatus.Size = new Size(495, 22);
            pnlStatus.Controls.Add(lblStatus);

            progressBar = new ProgressBar();
            progressBar.Location = new Point(14, 38);
            progressBar.Size = new Size(495, 14);
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 30;
            pnlStatus.Controls.Add(progressBar);

            // Log Label
            Label lblLogTitle = new Label();
            lblLogTitle.Text = "Nhật ký tiến trình máy chủ (Logs):";
            lblLogTitle.Font = new Font("Segoe UI", 8.5F, FontStyle.Bold);
            lblLogTitle.ForeColor = Color.FromArgb(71, 85, 105);
            lblLogTitle.Location = new Point(20, 174);
            lblLogTitle.AutoSize = true;
            this.Controls.Add(lblLogTitle);

            txtLogs = new TextBox();
            txtLogs.Location = new Point(20, 196);
            txtLogs.Size = new Size(525, 190);
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
            btnLaunchBrowser.Location = new Point(20, 398);
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
            btnHideToTray.Location = new Point(20, 448);
            btnHideToTray.Size = new Size(165, 36);
            btnHideToTray.BackColor = Color.White;
            btnHideToTray.ForeColor = Color.FromArgb(71, 85, 105);
            btnHideToTray.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            btnHideToTray.FlatStyle = FlatStyle.Flat;
            btnHideToTray.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnHideToTray.Cursor = Cursors.Hand;
            btnHideToTray.Click += (s, e) => HideToTray();
            this.Controls.Add(btnHideToTray);

            // Restart Button
            btnRestart = new Button();
            btnRestart.Text = "🔄 Khởi Động Lại";
            btnRestart.Location = new Point(195, 448);
            btnRestart.Size = new Size(170, 36);
            btnRestart.BackColor = Color.White;
            btnRestart.ForeColor = Color.FromArgb(71, 85, 105);
            btnRestart.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            btnRestart.FlatStyle = FlatStyle.Flat;
            btnRestart.FlatAppearance.BorderColor = Color.FromArgb(203, 213, 225);
            btnRestart.Cursor = Cursors.Hand;
            btnRestart.Click += (s, e) => {
                StopServer();
                AppendLog("Đang khởi động lại hệ thống...");
                StartCompleteStack();
            };
            this.Controls.Add(btnRestart);

            // Stop / Exit Button
            btnStopExit = new Button();
            btnStopExit.Text = "🛑 Dừng & Thoát";
            btnStopExit.Location = new Point(375, 448);
            btnStopExit.Size = new Size(170, 36);
            btnStopExit.BackColor = Color.FromArgb(254, 226, 226);
            btnStopExit.ForeColor = Color.FromArgb(153, 27, 27);
            btnStopExit.Font = new Font("Segoe UI", 9F, FontStyle.Bold);
            btnStopExit.FlatStyle = FlatStyle.Flat;
            btnStopExit.FlatAppearance.BorderColor = Color.FromArgb(254, 202, 202);
            btnStopExit.Cursor = Cursors.Hand;
            btnStopExit.Click += (s, e) => {
                isExplicitExit = true;
                StopServer();
                trayIcon.Visible = false;
                this.Close();
                Application.Exit();
            };
            this.Controls.Add(btnStopExit);

            // System Tray Icon
            trayIcon = new NotifyIcon();
            trayIcon.Text = "SIMPLY IT Community Edition";
            if (this.Icon != null) trayIcon.Icon = this.Icon;
            else trayIcon.Icon = SystemIcons.Shield;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => RestoreFromTray();

            ContextMenu trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("🌐 Mở Giao Diện SIMPLY IT", (s, e) => {
                try { Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true }); } catch {}
            });
            trayMenu.MenuItems.Add("🖥️ Bảng Điều Khiển Máy Chủ", (s, e) => RestoreFromTray());
            trayMenu.MenuItems.Add("🔄 Khởi Động Lại Hệ Thống", (s, e) => {
                StopServer();
                AppendLog("Khởi động lại toàn bộ hệ thống...");
                StartCompleteStack();
            });
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("🛑 Dừng & Thoát Hoàn Toàn", (s, e) => {
                isExplicitExit = true;
                StopServer();
                trayIcon.Visible = false;
                this.Close();
                Application.Exit();
            });
            trayIcon.ContextMenu = trayMenu;

            // Intercept close button [X]: hide to tray instead of quitting
            this.FormClosing += (s, e) => {
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

            // Polling timer to detect when web server is responding
            pollTimer = new System.Windows.Forms.Timer();
            pollTimer.Interval = 1000;
            pollTimer.Tick += (s, e) => CheckServerStatus();
            pollTimer.Start();
        }

        private void HideToTray()
        {
            this.ShowInTaskbar = false;
            this.WindowState = FormWindowState.Minimized;
            trayIcon.ShowBalloonTip(2000, "SIMPLY IT", "Máy chủ đang chạy ngầm dưới khay hệ thống. Double-click icon để mở lại bất kỳ lúc nào.", ToolTipIcon.Info);
        }

        private void RestoreFromTray()
        {
            this.ShowInTaskbar = true;
            this.WindowState = FormWindowState.Normal;
            this.BringToFront();
            this.Activate();
        }

        private void LocateAppDir()
        {
            string userRepo = @"F:\OneDrive - GELEX\Documents\GitHub\Simply-it-community";
            if (Directory.Exists(userRepo) && File.Exists(Path.Combine(userRepo, "package.json")))
            {
                appDir = userRepo;
                return;
            }

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (File.Exists(Path.Combine(baseDir, "package.json")))
            {
                appDir = baseDir;
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

            // Prevent text buffer overflow and memory freeze
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
                    IAsyncResult result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(200);
                    if (!success)
                    {
                        client.Close();
                        return false;
                    }
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

        private void StartCompleteStack()
        {
            if (isStarting) return;
            isStarting = true;

            Thread t = new Thread(() => {
                try
                {
                    AppendLog("Bắt đầu kiểm tra hệ thống SIMPLY IT Community...");

                    // 1. Clean conflicting port 3001 if any
                    AppendLog("1/3 Kiểm tra và giải phóng cổng " + targetPort + "...");
                    CleanupPortProcess(targetPort);

                    // 2. Ensure PostgreSQL service
                    UpdateStatusText("⏳ [1/3] Đang kiểm tra kết nối PostgreSQL (Port 5432)...");
                    AppendLog("2/3 Kiểm tra kết nối PostgreSQL trên cổng 5432...");
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

                // Try starting common service names
                string[] serviceNames = new string[] { "postgresql-x64-18", "postgresql-x64-16", "postgresql-x64-15", "postgresql" };
                foreach (string svc in serviceNames)
                {
                    try
                    {
                        Process p = Process.Start(new ProcessStartInfo("net", "start " + svc) {
                            CreateNoWindow = true,
                            UseShellExecute = false
                        });
                        if (p != null) p.WaitForExit(2000);
                        if (IsPortOpen(5432)) break;
                    }
                    catch {}
                }

                if (IsPortOpen(5432))
                {
                    AppendLog("✅ Đã khởi động dịch vụ PostgreSQL thành công!");
                }
                else
                {
                    AppendLog("ℹ️ Chưa phát hiện cổng 5432. Vẫn tiếp tục khởi động Web Server...");
                }
            }
            catch (Exception ex)
            {
                AppendLog("Kiểm tra PostgreSQL: " + ex.Message);
            }
        }

        private void LaunchNextJs()
        {
            try
            {
                UpdateStatusText("⏳ [2/3] Đang khởi động Web Server SIMPLY IT (Chế độ Production)...");
                AppendLog("🚀 [2/3] Bắt đầu chạy Web Server Production...");

                ProcessStartInfo psi = new ProcessStartInfo();
                string nodePath = @"C:\Program Files\nodejs\node.exe";
                if (File.Exists(nodePath))
                {
                    psi.FileName = nodePath;
                }
                else
                {
                    psi.FileName = "node";
                }
                psi.Arguments = "--max-old-space-size=4096 server.js";
                psi.WorkingDirectory = appDir;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;

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

            bool isWebUp = IsPortOpen(targetPort);

            if (isWebUp)
            {
                isServerRunning = true;
                OnServerReady();
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

            pnlStatus.BackColor = Color.FromArgb(227, 242, 253); // Light Blue
            pnlStatus.BorderStyle = BorderStyle.FixedSingle;
            lblStatus.Text = "✅ [3/3] SIMPLY IT đã sẵn sàng hoạt động (" + targetUrl + ")!";
            lblStatus.ForeColor = Color.FromArgb(13, 71, 161);
            progressBar.Style = ProgressBarStyle.Blocks;
            progressBar.Value = 100;

            btnLaunchBrowser.Enabled = true;
            btnLaunchBrowser.BackColor = Color.FromArgb(0, 184, 212);
            btnLaunchBrowser.ForeColor = Color.FromArgb(10, 26, 47);
            btnLaunchBrowser.Text = "🚀 MỞ GIAO DIỆN SIMPLY IT (" + targetUrl + ")";

            AppendLog("🎉 [3/3] SIMPLY IT ĐÃ SẴN SÀNG! Đang tự động mở trình duyệt...");
            try
            {
                if (trayIcon != null && trayIcon.Visible)
                {
                    trayIcon.ShowBalloonTip(3000, "SIMPLY IT Sẵn Sàng", "Hệ thống đã hoạt động tại " + targetUrl + ".", ToolTipIcon.Info);
                }
            }
            catch {}

            try
            {
                Process.Start(new ProcessStartInfo(targetUrl) { UseShellExecute = true });
            }
            catch {}
        }

        private void StopServer()
        {
            try
            {
                isServerRunning = false;
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    try
                    {
                        Process kp = Process.Start(new ProcessStartInfo("taskkill", "/F /T /PID " + serverProcess.Id) {
                            CreateNoWindow = true,
                            UseShellExecute = false
                        });
                        if (kp != null) kp.WaitForExit(2000);
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
