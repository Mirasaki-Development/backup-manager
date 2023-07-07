# backup-manager

Seamlessly create, manage, and deploy remote backups over SFTP/SSH

1. Download/clone the repository
2. Run `npm install` in the project directory
3. Rename `/config/config.example.yaml` to `/config/config.yaml` and provide your backup configuration
4. Run `npm run build`, followed by `npm run start` to start the application
    - Alternatively, use `npm i -g pm2`, followed by `pm2 start npm --name "backup-manager" -- start` to keep the application online in the background
    - Run `pm2 save`, this creates a dump-file. When your machine restarts, you can restart all your pm2 processes with `pm2 resurrect`

> Proper README coming soon =)
