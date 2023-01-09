var fs = require('fs');
var child_process = require('child_process');

function linux_install(cfg) {
    var script = `[Unit]
Description=${cfg.description}

[Service]
WorkingDirectory=${process.cwd()}
ExecStart='${process.execPath}' runnerd --daemon
Restart=always

[Install]
WantedBy=multi-user.target
`;

    fs.writeFile(`/etc/systemd/system/${cfg.name}.service`, script);
    child_process.run("systemctl", ["daemon-reload"]);
    child_process.run("systemctl", ["enable", cfg.name]);
    child_process.run("systemctl", ["start", cfg.name]);
}

function linux_uninstall(cfg) {
    child_process.run("systemctl", ["stop", cfg.name]);
    child_process.run("systemctl", ["disable", cfg.name]);
    fs.unlink(`/etc/systemd/system/${cfg.name}.service`);
    child_process.run("systemctl", ["daemon-reload"]);
}

function darwin_install(cfg) {
    var script = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
    <dict>

    <key>Label</key>
    <string>${cfg.description}</string>

    <key>WorkingDirectory</key>
    <string>${process.cwd()}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${process.execPath}</string>
        <string>runnerd</string>
        <string>--daemon</string>
    </array>

    <key>UserName</key>
    <string>root</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    </dict>
</plist>
`;

    var plist_file = `/Library/LaunchDaemons/${cfg.name}.plist`;
    fs.writeFile(plist_file, script);
    child_process.run("launchctl", ["load", plist_file]);
}

function darwin_uninstall(cfg) {
    var plist_file = `/Library/LaunchDaemons/${cfg.name}.plist`;
    if(fs.exists(plist_file)){
        child_process.run("launchctl", ["unload", plist_file]);
        fs.unlink(plist_file);
    }
}

exports.install = function (cfg) {
    console.log(`Installing ${cfg.name} as a service...`);

    if (process.platform == 'linux')
        linux_install(cfg);
    else if (process.platform == 'darwin')
        darwin_install(cfg);
    else
        throw new Error('Unsupported platform: ' + process.platform);
}

exports.uninstall = function (cfg) {
    console.log(`Uninstalling ${cfg.name} service...`);

    if (process.platform == 'linux')
        linux_uninstall(cfg);
    else if (process.platform == 'darwin')
        darwin_uninstall(cfg);
    else
        throw new Error('Unsupported platform: ' + process.platform);
}
