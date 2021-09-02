# process manager developed using fibjs
fib-runner is a process manager developed using fibjs, it runs in client/server mode, it allows the server to run in a secure user, keeps the service processes safe and secure, allows the client to manage the processes, view the output logs of the processes and monitor the process resource usage.

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

## Configuration File

The configuration file name is `runnerd.json` and needs to be stored in the current directory of the operating system when running `runnerd`. `runnerd` will automatically load the configuration file and start the specified service process according to the configuration file.

The configuration file is a json formatted file that must contain an array of fields named `"apps"` that specify the configuration of the service process.

The basic format of the configuration file is as follows:
```JavaScript
{
    "apps": [
        {
            "name": "app_name",
            "script": "/path/to/app.js"
        }
    ]
}
```

The service process is configured with the following parameters:
| Name      | Description | Default |
| ----------- | ----------- | --- |
| name | process name | undefined |
| description | description of the process | 'app_description' |
| exec | exec file, `runnerd` will start the program directly | undefined |
| script | script file, `runnerd` will use fibjs to start the script program | undefined |
| cwd | the working directory when the process starts | undefined |
| arg | the list of parameters when the process is started | [] |
| env | the environment variables when the process starts | {} |
| autostart | If true, this program will start automatically when `runnerd` is started. | true |
| startsecs | Number of seconds between retries | 1 |
| startretries | Number of consecutive failures allowed before abandonment | 3 |
| autorestart | Specify whether to automatically restart | true |
| signal | SIGTERM, SIGHUP, SIGINT, SIGQUIT, SIGKILL, SIGUSR1, or SIGUSR2 | "SIGTERM" |

The simplest process configuration must contains at least `name` and one of `exec` and `script`. When both `exec` and `script` are specified, `runnerd` will ignore the `script` configuration.

## Running runnerctl

To start `runnerctl`, run:
```sh
fibjs runnerctl
```
A shell will be presented that will allow you to control the processes that are currently managed by `runnerd`. Type “help” at the prompt to get information about the `runnerd` commands. `runnerctl` supports the following commands:
| Command      | Description |
| ----------- | ----------- |
| help              | Print this help message |
| list              | Display all processes status |
| reload            | Reload runnerd.json |
| stop name         | Stop specific process name |
| start name        | Start specific process name |
| restart name      | Restart specific process name |
| cpu name [1]      | Monitor cpu usage of specific process name |
| mem name [1]      | Monitor mem usage of specific process name |
| log name [80]     | Monitor output log of specific process name |
| attach name [80]  | Attach output log of specific process name |
| exit              | Exit runnerctl |

## Security control

In order to avoid security issues caused by illegal users using `runnerd` to elevate runtime privileges, only control operations and monitoring operations are allowed in `runnerctl`, and there is no permission to modify or add processes. If you need to modify or add processes, you need to modify `runnerd.json` manually and reload the service processes using the `reload` command. The administrator needs to ensure that `runnerd.json` is not allowed to be modified by anyone.

## Running runnerd as a daemon

If you need to start `runnerd` as a daemon, you need to configure the start parameter to:
```sh
fibjs runnerd --daemon
```
otherwise the daemon manager will find that `runnerd` has exited while the daemon is actually running.