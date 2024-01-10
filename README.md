<p align="center"><img src="assets/logo.png" alt="Mirasaki Music Bot Logo" height="60" style="border-radius:50px"/></p>
<h1 align="center">Backup Manager</h1>

<p align="center">
  This is a simple TypeScript (NodeJS) application to seamlessly manage backups over SFTP/SSH. Ideally, you would install this application on a dedicated machine. No proxies or web-servers required.
</p>

## Features

- Automatic Backups - Create backups of remote server content on a schedule
- Directory Backups - Create a backup of a directory on a remote server
- Directory Files Backups - Create a backup of directory on a remote server, but only backup whitelisted files
- Multiple Authentication Methods
  - Password Authentication
  - Private Key Authentication
  - SSH Auth Socket Authentication
- Proxy Support
- Desktop Notifications
- Compressed/zipped backups/archives
- Backup Rotation
- Configurable to your needs (we'll gladly accept pull requests)

## Installation

1. Download [the latest release](https://github.com/Mirasaki/backup-manager/releases) **or** clone the repository
2. Run `npm install` in the project directory to install all dependencies
3. Rename `/config/config.example.yaml` to `/config/config.yaml` and provide your backup configuration (see below for more information)
4. Run `npm run build`, followed by `npm run start` to start the application
    - Alternatively, use `npm i -g pm2`, followed by `pm2 start npm --name "backup-manager" -- start` to keep the application online in the background
    - If using `pm2`, run `pm2 save` - this creates a dump-file. When your machine restarts, you can restart all your pm2 processes with `pm2 resurrect`

## Configuration

This merely serves as an example for reference, always create your config file from the `/config/config.example.yaml` file!

The configuration file is located at `/config/config.yaml`. The configuration file is written in YAML. You can use [this website](https://www.yamllint.com/) to validate your configuration file.

### Example Configuration

```yaml
--- # SFTP data

# Remote connection address
# The server/machine where to get files from
remote: &remote
  host: 41.17.129.420 # Your public IP
  port: 8282 # Your SSH port

# Password authentication
username: mirasaki
password: your-password-here

# Your private SSH key, if you use one (publickey method)
private-key: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    YOUR PRIVATE KEY HERE
    -----END OPENSSH PRIVATE KEY-----
# Your SSH passphrase, if your key requires it
passphrase: your-passphrase-here
# Alternatively, provide an SSH Auth socket/agent
# Path to ssh-agent's UNIX socket for ssh-agent-based user authentication (or 'pageant' when using Pagent on Windows).
ssh-auth-sock: 

# Your (optional) SOCKS proxy configuration
proxy:
  enabled: false
  host: 159.203.75.200 # proxy hostname
  port: 1080 # proxy port
  type: 5 # For SOCKS v5 - 4 or 5
  command: connect # SOCKS command (createConnection factory function only supports the connect command)
  destination: *remote # Use remote host reference
```

### Backup Configuration

‼️ If `destination` doesn't exist, the folder will be created recursively

#### Directory Files Backup (Entries)

This example creates a backup of the `/D:/DayZ/servers/1` directory on the remote server, and stores it in the `backups/DayZ/PartialBackups` directory on the local machine. The backup is compressed, and a new backup is created every 3 hours. The last 24 backups are kept, which means that backups older than 3 days are deleted.

Only the files listed in the `entries` array are included in the back-up.

```yaml
-   type: Entries
    origin: /D:/DayZ/servers/1
    destination: backups/DayZ/PartialBackups
    compress: true
    interval: 180   # Every 3 hours
    keep-latest: 24 # 3 Days
    entries:
        - mpmissions\unchained.chernarusplus
        - profiles
        - serverDZ.cfg
        - omega.cfg
```

#### Directory Backup

This example creates a backup of the `/D:/DayZ/servers/1` directory on the remote server, and stores it in the `backups/DayZ/OmegaManagerBackups` directory on the local machine. The backup is compressed, and a new backup is created every hour. The last 72 backups are kept, which means that backups older than 3 days are deleted.

```yaml
-   type: Directory
    origin: /D:/DayZ/servers/1/backups
    destination: backups/DayZ/OmegaManagerBackups
    compress: true
    interval: 60    # Every hour
    keep-latest: 72 # 3 days
```

#### Directory Backup (Full)

The following example creates a backup of the `/D:/DayZ/servers/1` directory on the remote server, and stores it in the `backups/DayZ/FullBackups` directory on the local machine. The backup is compressed, and a new backup is created every day. Only the latest, single backup is kept.

```yaml
-   type: Directory
    enabled: false
    origin: /D:/DayZ/servers/1
    destination: backups/DayZ/FullBackups
    compress: true
    interval: 1440  # Daily
    keep-latest: 1  # 1 Day
```

> Hi there, and thank you for your interest in this project! This application could definitely do a lot more than what it currently offers, we'd love to hear about your use-cases so that we can support a variety of other workflows. [Request a feature here](https://github.com/Mirasaki/backup-manager/issues)

#### Multiple Server Backups

All of the server/authentication options can also be provided in task configurations to override the target server.

Take the following task as an example:

```yaml
-   type: Directory
    enabled: false
    origin: /D:/DayZ/servers/1
    destination: backups/DayZ/FullBackups
    compress: true
    interval: 1440  # Daily
    keep-latest: 1  # 1 Day
```

Let's say we need to run this task on a different server than our default, origin server. We can simply override the ip/origin address, and provide different credentials:

```yaml
-   type: Directory
    # ... Existing task properties
    keep-latest: 1  # 1 Day
    # Auth/server options
    remote:
      host: 41.69.129.420
      port: 9292
    username: mirasaki
    password: your-password-here
```

## Attribution

- <a href="https://www.flaticon.com/free-icons/backup" title="backup icons">Backup icon created by Freepik - Flaticon</a>
