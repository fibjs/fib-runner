# process manager developed using fibjs
fib-runner is a process manager developed using fibjs, it runs in client/server mode, it allows the server to run in a secure user, keeps the processes safe and secure, allows the client to manage the processes, view the output logs of the processes and monitor the process resource usage.

## Install

```sh
fibjs --install fib-runner [--save]
```

## Running runnerd

Execute the following command:
```sh
fibjs runnerd
```
will start the `runnerd` daemon. The daemon will run in the background and you can continue other work in the terminal or log out without suspending the daemon.

## Install runnerd as a service

Using `runnerctl`, `runnerd` can be installed as a system service and run automatically at system startup.
```sh
sudo fibjs runnerctl install
sudo fibjs runnerctl uninstall
```
## Configuration File

The configuration file name is ``runner.json`` and needs to be stored in the current directory of the operating system when running `runnerd`. `runnerd` will automatically load the configuration file and start the specified process according to the configuration file.

The configuration file is a json formatted file that must contain an array of fields named `"apps"` that specify the configuration of the process.

The basic format of the configuration file is as follows:
```JavaScript
{
    "name": "fib-runner",
    "description": "fibjs service runner",
    "listen": {
        "address": "127.0.0.1",
        "port": 1123
    },
    "apps": [
        {
            "name": "exec_name",
            "script": "/path/to/app"
        },
        {
            "name": "script_name",
            "script": "/path/to/app.js"
        },
        {
            "name": "prj_name",
            "runner": "/project/path/to"
        },
    ]
}
```

Each process is configured with the following parameters:
| Name      | Description | Default |
| ----------- | ----------- | --- |
| name | process name | undefined |
| description | description of the process | 'app_description' |
| exec | exec file, `runnerd` will start the program directly | undefined |
| script | script file, `runnerd` will use fibjs to start the script program | undefined |
| runner | external runner folder, `runnerd` will load `runner.json` from this directory as a subproject | undefined |
| cwd | the working directory when the process starts | undefined |
| arg | the list of parameters when the process is started | [] |
| env | the environment variables when the process starts | {} |
| autostart | If true, this program will start automatically when `runnerd` is started. | true |
| startsecs | Number of seconds between retries | 1 |
| startretries | Number of consecutive failures allowed before abandonment, set to -1 for unlimited retries | 3 |
| autorestart | Specify whether to automatically restart | true |
| savelog | Automatically save logs when a process exits abnormally | false |
| signal | SIGTERM, SIGHUP, SIGINT, SIGQUIT, SIGKILL, SIGUSR1, or SIGUSR2 | "SIGTERM" |

The simplest process configuration must contains at least `name` and one of `exec` and `script`. When both `exec` and `script` are specified, `runnerd` will ignore the `script` configuration.

## Sub project

By configuring the property runner in `runner.json` , `runnerd` can manage external projects. For example, we have a runner project, which is stored under the directory `ext-app`, and the content of `runner.json` is as follows:
```JavaScript
{
    "apps": [
        {
            "name": "app5",
            "script": "app5.js"
        }
    ]
}
```
In the main `runner.json` configuration, add the sub project as follows:
```JavaScript
{
    "apps": [
        {
            "name": "ext",
            "runner": "ext-app"
        }
    ]
}
```
After running `runnerd` we will get a process list like this:
| (index)  |  pid  | status  | retries | uptime | user  |  sys  |   rss    |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ext.app5 | 50026 | RUNNING |    0    |  5.8s  | 0.02% | 0.01% | 28.41 MB |

## Remote management

By default, `runnerd` does not allow remote control, and the control interface is bound to ip `127.0.0.1`. If you want to control the `runnerd` service remotely, you need to manually modify `runner.json` to enable remote management. 

step 1, you need to allow external ip access control interface:
```JavaScript
{
    "listen": {
        "address": "0.0.0.0",
        "port": 1123
    }
}
```
step 2, check `runner.json` in an admin node to find your public key, if `runner.json` does not exist, you can run `runnerctl` to generate it automatically:
```JavaScript
{
    "key": {
        "pub": "AmqJ_fkfQxKnuoG3-fkgNs51jVMj6oS9-XvPGw7Np4ZJ",
        "key": "wHo9IdgYD-XattkLC8uj85T0G1a-ZPob0PELQVUv2aE",
        "admin": []
    },
}
```
step 3, add your public key `"AmqJ_fkfQxKnuoG3-fkgNs51jVMj6oS9-XvPGw7Np4ZJ"` to the admin list of `runner.json` in the worker node::
```JavaScript
{
    "key": {
        "pub": "A8Vw0C1U0nEkXLQBQ0GzC8WIPZyyt-UtNsVMvnMuSJaX",
        "key": "6u3vfP8yRMgePxcDqPBZVNrOKD2iSAKKdN8SA6iKCXk",
        "admin": [
            "AmqJ_fkfQxKnuoG3-fkgNs51jVMj6oS9-XvPGw7Np4ZJ"
        ]
    }
}
```
Now you can control the `runnerd` service in the worker node from the admin node:
```sh
fibjs runnerctl -s ip:port
```

## Running runnerctl

To start `runnerctl`, run:
```sh
fibjs runnerctl [-s ip:port] [command] [...args]
```
A shell will be presented that will allow you to control the processes that are currently managed by `runnerd`. Type “help” at the prompt to get information about the `runnerd` commands. `runnerctl` supports the following commands:
| Command      | Description |
| ----------- | ----------- |
| help              | Print this help message |
| install           | Install runnerd as a service |
| uninstall         | Uninstall runnerd service |
| list              | Display all processes status |
| reload            | Reload runner.json |
| stop name         | Stop specific process name |
| start name        | Start specific process name |
| restart name      | Restart specific process name |
| log name [80]     | Monitor output log of specific process name |
| attach name [80]  | Attach output log of specific process name, ctrl+z to exit |
| .{stat} name [1]  | Monitor {stat} statistics of specific process name<br>{stat} will be rss, cpu, user, sys etc.  |
| exit              | Exit runnerctl |

The `runnerctl` command can also be executed from the command line, such as:
```sh
fibjs runnerctl list
```

## Security control

In order to avoid security issues caused by illegal users using `runnerd` to elevate runtime privileges, only control and monitor operations are allowed in `runnerctl`, and there is no permission to modify or add processes. If you want to modify or add processes, you need to modify `runner.json` manually and reload the processes using the `reload` command. The administrator needs to ensure that `runner.json` is not allowed to be modified by anyone.

## Unexpected exit log

When the managed child process exits, if `runnerd` detects that this is an unexpected termination, it will automatically save the output of the child process to a log file named `log_${pid}.txt`.

## Used as a module

You can also use `fib-runner` as a module, allowing more flexibility to customize process management to your needs by programming the `fib-runner` api directly.