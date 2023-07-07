export enum CreateBackupTypes {
  /** Creates a backup of `origin` */
  Directory,
  /** Creates a backup of all entries (files & directories) within `origin` */
  Entries,
  /** Creates a backup of all new/edited files since last backup within `origin` */
  Changed,
  /** Creates a backup of all files that are present in the user provided `list` within and relative to `origin` */
  List
}

export type CreateBackupType = Record<CreateBackupTypes, string>

export type TaskRunFn = () => void

export interface ValidFileInfoExistsRes {
  type: 'd' | '-' | 'l'
  fileName: string
  remotePath: string
}

export type FileInfoExistsRes = false | ValidFileInfoExistsRes
