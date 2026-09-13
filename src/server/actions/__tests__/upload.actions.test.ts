import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth-helpers', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/utils/uploads', () => ({
  isAllowedImage: vi.fn(),
  matchesMagicBytes: vi.fn(),
  extensionFromMime: vi.fn(),
  publicUploadsDir: vi.fn(() => '/tmp/uploads'),
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024,
}))

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn(),
}))

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'uuid-1234'),
}))

import { requireAdmin } from '@/lib/auth-helpers'
import { isAllowedImage, matchesMagicBytes, extensionFromMime, publicUploadsDir } from '@/lib/utils/uploads'
import { uploadImageAction } from '@/server/actions/upload.actions'
import { writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const mockedRequireAdmin = vi.mocked(requireAdmin)
const mockedIsAllowed = vi.mocked(isAllowedImage)
const mockedMatches = vi.mocked(matchesMagicBytes)
const mockedExtension = vi.mocked(extensionFromMime)
const mockedDir = vi.mocked(publicUploadsDir)
const mockedWrite = vi.mocked(writeFile)
const mockedUUID = vi.mocked(randomUUID)

function makeFile(overrides: { type?: string; size?: number; name?: string; arrayBuffer?: () => Promise<ArrayBuffer> } = {}): File {
  const type = overrides.type ?? 'image/jpeg'
  const name = overrides.name ?? 'test.jpg'
  const file = new File(['dummy'], name, { type })
  if (overrides.size !== undefined) {
    Object.defineProperty(file, 'size', { value: overrides.size, writable: false })
  }
  if (overrides.arrayBuffer) {
    file.arrayBuffer = overrides.arrayBuffer as unknown as typeof file.arrayBuffer
    file.slice = vi.fn(() => ({ arrayBuffer: overrides.arrayBuffer as unknown as () => Promise<ArrayBuffer> })) as unknown as typeof file.slice
  } else {
    const bufFn = async () => new ArrayBuffer(8)
    file.arrayBuffer = bufFn as unknown as typeof file.arrayBuffer
    file.slice = vi.fn(() => ({ arrayBuffer: bufFn })) as unknown as typeof file.slice
  }
  return file
}

function formWithFile(file: File | string): FormData {
  const fd = new FormData()
  if (file instanceof File) fd.set('file', file)
  else fd.set('file', file)
  return fd
}

describe('upload.actions mocked unit — delegates to utils/uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'AGENT' } as never)
    mockedIsAllowed.mockReturnValue(true)
    mockedMatches.mockResolvedValue(true)
    mockedExtension.mockReturnValue('.jpg')
    mockedWrite.mockResolvedValue(undefined as never)
    mockedUUID.mockReturnValue('uuid-1234' as never)
    mockedDir.mockReturnValue('/tmp/uploads')
  })

  describe('uploadImageAction', () => {
    it('returns error when file missing (not File)', async () => {
      // Arrange: FormData with string not File
      const fd = formWithFile('not-a-file')

      // Act
      const result = await uploadImageAction(fd)

      // Assert
      expect(result).toEqual(expect.objectContaining({ error: expect.stringMatching(/Selecciona una imagen/) }))
      expect(mockedRequireAdmin).toHaveBeenCalled()
      expect(mockedIsAllowed).not.toHaveBeenCalled()
    })

    it('returns error when file field absent', async () => {
      // Arrange: empty FormData
      const fd = new FormData()

      // Act
      const result = await uploadImageAction(fd)

      // Assert
      expect(result).toEqual(expect.objectContaining({ error: expect.stringMatching(/Selecciona/) }))
    })

    it('delegates to isAllowedImage and returns error when false', async () => {
      // Arrange
      mockedIsAllowed.mockReturnValue(false)
      const file = makeFile({ type: 'application/pdf' })

      // Act
      const result = await uploadImageAction(formWithFile(file))

      // Assert
      expect(result).toEqual(expect.objectContaining({ error: expect.stringMatching(/Formato de imagen no permitido/) }))
      expect(mockedIsAllowed).toHaveBeenCalledWith(file)
      expect(mockedWrite).not.toHaveBeenCalled()
    })

    it('returns error when file exceeds 5MB', async () => {
      // Arrange
      const file = makeFile({ size: 5 * 1024 * 1024 + 1 })

      // Act
      const result = await uploadImageAction(formWithFile(file))

      // Assert
      expect(result).toEqual(expect.objectContaining({ error: expect.stringMatching(/5MB/) }))
    })

    it('delegates to matchesMagicBytes and returns error when mismatch', async () => {
      // Arrange
      mockedMatches.mockResolvedValue(false)
      const file = makeFile()

      // Act
      const result = await uploadImageAction(formWithFile(file))

      // Assert
      expect(result).toEqual(expect.objectContaining({ error: expect.stringMatching(/no es una imagen válida/) }))
      expect(mockedMatches).toHaveBeenCalledWith(file)
    })

    it('delegates to extensionFromMime and returns error when null', async () => {
      // Arrange: isAllowedImage true but extension null — branch for safety
      mockedExtension.mockReturnValue(null)
      const file = makeFile({ type: 'image/jpeg' })

      // Act
      const result = await uploadImageAction(formWithFile(file))

      // Assert
      expect(result).toEqual(expect.objectContaining({ error: expect.stringMatching(/Formato de imagen/) }))
      expect(mockedExtension).toHaveBeenCalledWith('image/jpeg')
    })

    it('uploads successfully and returns url with uuid', async () => {
      // Arrange
      const file = makeFile({ type: 'image/png' })
      mockedExtension.mockReturnValue('.png')
      mockedUUID.mockReturnValue('test-uuid-9999' as never)

      // Act
      const result = await uploadImageAction(formWithFile(file))

      // Assert
      expect(result).toEqual({ url: '/uploads/test-uuid-9999.png' })
      expect(mockedWrite).toHaveBeenCalledWith(expect.stringContaining('/tmp/uploads'), expect.any(Buffer))
      const writePath = mockedWrite.mock.calls[0]?.[0] as string
      expect(writePath).toContain('test-uuid-9999.png')
    })

    it('handles different mime extensions (webp)', async () => {
      // Arrange
      const file = makeFile({ type: 'image/webp' })
      mockedExtension.mockReturnValue('.webp')

      // Act
      const result = await uploadImageAction(formWithFile(file))

      // Assert
      expect(result).toEqual({ url: '/uploads/uuid-1234.webp' })
    })

    it('returns error when writeFile throws', async () => {
      // Arrange
      mockedWrite.mockRejectedValue(new Error('disk full'))
      const file = makeFile()

      // Act
      const result = await uploadImageAction(formWithFile(file))

      // Assert
      expect(result).toEqual(expect.objectContaining({ error: expect.stringMatching(/No se pudo guardar/) }))
    })

    it('propagates requireAdmin throw (redirect)', async () => {
      // Arrange
      mockedRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'))

      // Act & Assert
      await expect(uploadImageAction(formWithFile(makeFile()))).rejects.toThrow('NEXT_REDIRECT')
    })

    it('calls arrayBuffer to build buffer before write', async () => {
      // Arrange
      const arrayBufSpy = vi.fn(async () => new ArrayBuffer(10))
      const file = makeFile({ arrayBuffer: arrayBufSpy })

      // Act
      await uploadImageAction(formWithFile(file))

      // Assert
      expect(arrayBufSpy).toHaveBeenCalled()
      expect(mockedWrite).toHaveBeenCalled()
    })

    it('does not call matchesMagicBytes when size fails', async () => {
      // Arrange: size too big, matches should not be called
      const file = makeFile({ size: 6 * 1024 * 1024 })

      // Act
      await uploadImageAction(formWithFile(file))

      // Assert
      expect(mockedMatches).not.toHaveBeenCalled()
    })

    it('verifies publicUploadsDir called for write path', async () => {
      // Arrange
      const file = makeFile()

      // Act
      await uploadImageAction(formWithFile(file))

      // Assert
      expect(mockedDir).toHaveBeenCalled()
    })
  })
})
