import path from 'path'
import { readdirSync, statSync } from 'fs'
import { MS_IN_ONE_DAY, MS_IN_ONE_HOUR, MS_IN_ONE_MINUTE, MS_IN_ONE_SECOND } from './magic-number'

export const wait = async (ms: number): Promise<any> => await new Promise(resolve => setTimeout(resolve, ms))

export const sortFilesByCreationTime = (allFiles: string[]): string[] => {
  const filesWithTimestamps = allFiles.map((fileName) => ({
    fileName,
    ctimeMs: statSync(fileName).ctimeMs
  }))
  filesWithTimestamps.sort((a, b) => b.ctimeMs - a.ctimeMs)
  return filesWithTimestamps.map((file) => file.fileName)
}

export const msToHumanReadableTime = (ms: number): string => {
  const days = Math.floor(ms / MS_IN_ONE_DAY)
  const hours = Math.floor((ms % MS_IN_ONE_DAY) / MS_IN_ONE_HOUR)
  const minutes = Math.floor((ms % MS_IN_ONE_HOUR) / MS_IN_ONE_MINUTE)
  const seconds = Math.floor((ms % MS_IN_ONE_MINUTE) / MS_IN_ONE_SECOND)

  const parts = []
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
  if (seconds > 0) parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`)

  if (parts.length === 0) return '0 seconds'
  else if (parts.length === 1) return parts[0] as string
  else if (parts.length === 2) return `${parts[0] as string} and ${parts[1] as string}`
  else {
    const lastPart = parts.pop()
    const formattedParts = parts.join(', ')
    return `${formattedParts}, and ${lastPart as string}`
  }
}

// export const getFiles = (requestedPath: string, allowedExtensions = [
//   '.js',
//   '.mjs',
//   '.cjs'
// ]): string[] => {
//   if (typeof allowedExtensions === 'string') allowedExtensions = [allowedExtensions]
//   requestedPath ??= path.resolve(requestedPath)
//   let res: string[] = []

//   for (let itemInDir of readdirSync(requestedPath)) {
//     itemInDir = path.resolve(requestedPath, itemInDir)
//     const stat = statSync(itemInDir)
//     if (stat.isDirectory()) res = res.concat(getFiles(itemInDir, allowedExtensions))
//     else if (
//       stat.isFile() &&
//       (allowedExtensions.find((ext) => itemInDir.endsWith(ext)) != null) &&
//       !itemInDir.slice(
//         itemInDir.lastIndexOf(path.sep) + 1, itemInDir.length
//       ).startsWith('.')
//     ) res.push(itemInDir)
//   }
//   return res
// }

/**
 * Returns a list of all empty directories within a given path
 */
export const getEmptyFolders = (dirPath: string): string[] => {
  const result: string[] = []

  // Read the contents of the directory
  const files = readdirSync(dirPath)

  // Iterate over each file/directory
  files.forEach((file) => {
    const filePath = path.join(dirPath, file)

    // Check if it's a directory
    if (statSync(filePath).isDirectory()) {
      // Recursively call the function for subdirectories
      const subFolders = getEmptyFolders(filePath)

      // If the subdirectory is empty, add it to the result array
      if (subFolders.length === 0) result.push(filePath)
    }
  })

  return result
}

export const goOneDirectoryUp = (targetPath: string): string => {
  // Normalize the file path to ensure consistency across OSs
  const normalizedPath = path.normalize(targetPath)

  // Split the file path into individual parts
  const pathParts = normalizedPath.split(path.sep)

  // Remove the last part (nested directory or file)
  pathParts.pop()

  // Join the path parts back together to get the updated file path
  const updatedPath = pathParts.join(path.sep)

  return updatedPath
}
