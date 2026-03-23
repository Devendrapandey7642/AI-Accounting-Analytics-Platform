import { useCallback, useRef, useState, DragEvent, ChangeEvent } from 'react'
import type { AxiosError } from 'axios'
import { Upload, FileText, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { uploadFile } from '../services/apiService'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.tsv', '.txt', '.xml']
const LARGE_FILE_THRESHOLD = 20 * 1024 * 1024
const MAX_FILE_SIZE = 250 * 1024 * 1024

interface UploadErrorPayload {
  detail?: string
}

interface UploadedFileMeta {
  fileSize?: number
  largeFile?: boolean
  message?: string
}

interface FileUploadProps {
  onUploadComplete?: (uploadId: string) => void
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) {
    return 'Unknown size'
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const FileUploader = ({ onUploadComplete }: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [lastProgressUpdate, setLastProgressUpdate] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [uploadedFileMeta, setUploadedFileMeta] = useState<UploadedFileMeta | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([])
  const setUploadId = useAppStore((state) => state.setUploadId)
  const navigate = useNavigate()

  const isSupportedFile = useCallback((file: File) => {
    const lowerName = file.name.toLowerCase()
    return ALLOWED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
  }, [])

  const handleFileSelect = useCallback((fileList: FileList) => {
    if (!fileList || fileList.length === 0) {
      return
    }

    const file = Array.from(fileList)[0]
    if (file && isSupportedFile(file)) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError('Please upload a file smaller than 250 MB.')
        return
      }

      setFiles([file])
      setUploadError(null)
      setUploadWarnings(
        file.size >= LARGE_FILE_THRESHOLD
          ? ['Large file detected. The platform will switch to large-file mode and analysis may take longer.']
          : []
      )
    } else {
      setUploadError('Please upload a CSV, Excel, TSV, TXT, or XML file.')
    }
  }, [isSupportedFile])

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const handleUpload = async () => {
    if (files.length === 0) return

    const file = files[0]
    setUploading(true)
    setUploadProgress(0)
    setLastProgressUpdate(0)
    setUploadError(null)
    setUploadWarnings(file.size >= LARGE_FILE_THRESHOLD ? ['Large file mode enabled. Streaming upload is in progress.'] : [])
    setUploadSuccess(false) // Reset success state
    setUploadedFileMeta(null)

    // Set a timeout to prevent hanging
    const uploadTimeout = setTimeout(() => {
      setUploadError('Upload timed out. Please try again.')
      setUploading(false)
    }, 300000) // 5 minutes timeout

    // Fallback progress updater for large files
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 90) {
          const newProgress = Math.min(90, prev + Math.random() * 5)
          return newProgress
        }
        return prev
      })
    }, 2000) // Update every 2 seconds

    try {
      const response = await uploadFile(file, (progress) => {
        if (progress === 100 || progress - lastProgressUpdate >= 5) {
          setUploadProgress(progress)
          setLastProgressUpdate(progress)
        }
      })
      clearTimeout(uploadTimeout)
      clearInterval(progressInterval)
      setUploadId(response.upload_id.toString())
      setUploadedFileId(response.upload_id.toString())
      setUploadedFileMeta({
        fileSize: response.file_size,
        largeFile: response.large_file,
        message: response.message,
      })
      setUploadWarnings(response.warnings || [])
      setUploadSuccess(true)
      onUploadComplete?.(response.upload_id.toString())
    } catch (error: unknown) {
      clearTimeout(uploadTimeout)
      clearInterval(progressInterval)
      const axiosError = error as AxiosError<UploadErrorPayload>
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        'Upload failed. Please check your file and try again.'
      setUploadError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleContinue = () => {
    if (uploadedFileId) {
      navigate(`/processing/${uploadedFileId}`)
    }
  }

  const handleTryAgain = () => {
    setUploadError(null)
    setUploadSuccess(false)
    setUploadedFileId(null)
    setUploadedFileMeta(null)
    setUploadWarnings([])
  }

  const handleUploadDifferent = () => {
    setFiles([])
    setUploadError(null)
    setUploadSuccess(false)
    setUploadedFileId(null)
    setUploadedFileMeta(null)
    setUploadWarnings([])
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const allowPickerOverlay = files.length === 0 && !uploading && !uploadSuccess
  const selectedFile = files[0]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      role={allowPickerOverlay ? 'button' : undefined}
      tabIndex={allowPickerOverlay ? 0 : -1}
      onClick={allowPickerOverlay ? openFilePicker : undefined}
      onKeyDown={allowPickerOverlay ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openFilePicker()
        }
      } : undefined}
      className={`relative rounded-[2rem] border-2 border-dashed p-4 transition-all duration-300 sm:rounded-3xl sm:border-4 sm:p-8 lg:p-10 ${
        dragActive
          ? 'border-blue-400 bg-blue-50 shadow-2xl ring-4 ring-blue-100'
          : 'border-gray-300 bg-white/70 hover:border-gray-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".csv,.xlsx,.xls,.tsv,.txt,.xml"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files)
          }
          e.target.value = ''
        }}
      />

      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl sm:mb-6 sm:h-20 sm:w-20">
          <Upload className="h-8 w-8 text-white sm:h-10 sm:w-10" />
        </div>

        <div className="mb-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:text-xs">
          <span>Phone-friendly upload</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
          <span>Up to 250 MB</span>
        </div>

        <h3 className="mb-2 text-balance text-xl font-bold text-gray-900 sm:text-2xl">
          Upload your accounting file
        </h3>
        <p className="mb-6 max-w-xl text-sm leading-6 text-gray-600 sm:mb-8 sm:text-base sm:leading-7">
          Tap to choose a file or drag and drop on desktop. CSV, Excel, TSV, TXT, and XML formats are supported.
        </p>

        <div className="mb-6 flex w-full flex-wrap items-center justify-center gap-2 text-xs text-slate-500 sm:text-sm">
          {ALLOWED_EXTENSIONS.map((extension) => (
            <span
              key={extension}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium uppercase tracking-[0.08em]"
            >
              {extension.replace('.', '')}
            </span>
          ))}
        </div>

        {files.length === 0 && (
          <div className="mb-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(event) => {
                event.stopPropagation()
                openFilePicker()
              }}
              className="pointer-events-auto w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3.5 font-bold text-white shadow-xl transition-all hover:from-blue-700 hover:to-blue-800 sm:w-auto"
            >
              Choose File
            </motion.button>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Best on phone: use the file picker and continue to analysis after upload.
            </div>
          </div>
        )}

        {files.length > 0 && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mx-auto mb-6 w-full max-w-xl rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center space-x-3 text-left">
                <FileText className="h-8 w-8 text-green-600" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)} / Ready for analysis
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-green-700">
                  Selected file
                </div>
                <button
                  type="button"
                  onClick={handleUploadDifferent}
                  className="pointer-events-auto rounded-xl p-2 transition-colors hover:bg-green-200"
                  aria-label="Remove selected file"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {uploadWarnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 w-full max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"
          >
            <div className="flex items-start space-x-3">
              <Sparkles className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="space-y-2">
                {uploadWarnings.map((warning) => (
                  <p key={warning} className="text-amber-800 text-sm leading-6">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-6 w-full max-w-xl rounded-2xl border border-red-200 bg-red-50 p-4 text-left"
          >
            <div className="flex items-center space-x-3 mb-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700 font-medium">{uploadError}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(event) => {
                event.stopPropagation()
                handleTryAgain()
              }}
              className="pointer-events-auto px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </motion.button>
          </motion.div>
        )}

        {uploading ? (
          <div className="w-full max-w-xl text-center">
            <div className="mb-4 h-4 w-full overflow-hidden rounded-full bg-gray-200">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full shadow-lg"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-blue-600 font-medium">
              {uploadProgress < 100 ? `Uploading and analyzing your file... ${uploadProgress}%` : 'Processing complete!'}
            </p>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <p className="text-sm text-gray-500 mt-2">
                This may take a few minutes for large files
              </p>
            )}
          </div>
        ) : uploadSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h4 className="mb-2 text-xl font-bold text-gray-900">Upload Successful!</h4>
            <p className="text-gray-600 mb-3">{uploadedFileMeta?.message || 'Your file has been uploaded and is ready for analysis.'}</p>
            <div className="mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold">{uploadedFileMeta?.largeFile ? 'Large-file mode ready' : 'Fast analysis mode ready'}</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-400 sm:inline-block" />
              <span>{formatFileSize(uploadedFileMeta?.fileSize || selectedFile?.size)}</span>
            </div>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleContinue}
                className="pointer-events-auto w-full rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-green-700 hover:to-green-800 sm:w-auto"
              >
                Next: Start Analysis
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleUploadDifferent}
                className="pointer-events-auto w-full rounded-xl bg-gray-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:bg-gray-700 sm:w-auto"
              >
                Upload Different File
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUpload}
            disabled={files.length === 0}
            className="pointer-events-auto w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 font-bold text-white shadow-xl transition-all hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-12"
          >
            Analyze File
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}

export default FileUploader
