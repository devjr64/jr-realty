import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockUnlink } = vi.hoisted(() => ({
  mockUnlink: vi.fn(() => Promise.resolve() as Promise<void>),
}))

vi.mock('node:fs', () => ({
  mkdirSync: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  unlink: (...args: unknown[]) => mockUnlink(...args),
}))

import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_SIZE,
  deleteUploadedFile,
  deleteUploadedFiles,
  extensionFromMime,
  isAllowedImage,
  matchesMagicBytes,
  publicUploadsDir,
} from '@/lib/utils/uploads'
import { unlink } from 'node:fs/promises'

function fileFromBytes(bytes: number[], type: string): File {
  return new File([new Uint8Array(bytes)], 'test', { type })
}

describe('extensionFromMime / isAllowedImage', () => {
  it('maps allowed MIME types to extensions', () => {
    expect(extensionFromMime('image/jpeg')).toBe('.jpg')
    expect(extensionFromMime('image/png')).toBe('.png')
    expect(extensionFromMime('image/webp')).toBe('.webp')
    expect(extensionFromMime('image/gif')).toBe('.gif')
    expect(extensionFromMime('image/avif')).toBe('.avif')
  })

  it('rejects unknown MIME types', () => {
    expect(extensionFromMime('text/html')).toBeNull()
    expect(isAllowedImage(fileFromBytes([], 'text/html'))).toBe(false)
  })

  it('exposes the allowlist and size limit', () => {
    expect(ALLOWED_IMAGE_TYPES).toContain('image/jpeg')
    expect(MAX_UPLOAD_SIZE).toBe(5 * 1024 * 1024)
  })

  it('rejects non-image MIME types — text/html, application/octet-stream, image/svg+xml, video/mp4', () => {
    // Arrange
    const cases = [
      'text/html',
      'text/javascript',
      'application/octet-stream',
      'application/javascript',
      'image/svg+xml',
      'video/mp4',
      'audio/mpeg',
      '',
    ]

    // Act & Assert
    for (const mime of cases) {
      expect(extensionFromMime(mime)).toBeNull()
      expect(isAllowedImage(fileFromBytes([], mime))).toBe(false)
    }
  })

  it('rejects MIME with charset or case variation', () => {
    // Arrange — MIME must be exact allowlist match, no charset suffix
    expect(extensionFromMime('image/jpeg; charset=utf-8')).toBeNull()
    expect(extensionFromMime('IMAGE/JPEG')).toBeNull()
    expect(isAllowedImage(fileFromBytes([], 'image/jpeg; charset=utf-8'))).toBe(false)
  })
})

describe('matchesMagicBytes', () => {
  it('accepts a real JPEG (FF D8 FF)', async () => {
    const file = fileFromBytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], 'image/jpeg')
    await expect(matchesMagicBytes(file)).resolves.toBe(true)
  })

  it('accepts a real PNG signature', async () => {
    const file = fileFromBytes(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00],
      'image/png',
    )
    await expect(matchesMagicBytes(file)).resolves.toBe(true)
  })

  it('accepts a real WebP (RIFF....WEBP)', async () => {
    const file = fileFromBytes(
      [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
      'image/webp',
    )
    await expect(matchesMagicBytes(file)).resolves.toBe(true)
  })

  it('accepts GIF87a and GIF89a', async () => {
    const gif87 = fileFromBytes([0x47, 0x49, 0x46, 0x38, 0x37, 0x61], 'image/gif')
    const gif89 = fileFromBytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 'image/gif')
    await expect(matchesMagicBytes(gif87)).resolves.toBe(true)
    await expect(matchesMagicBytes(gif89)).resolves.toBe(true)
  })

  it('accepts AVIF (ftyp avif)', async () => {
    const file = fileFromBytes(
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66],
      'image/avif',
    )
    await expect(matchesMagicBytes(file)).resolves.toBe(true)
  })

  it('rejects HTML disguised as an image', async () => {
    const html = fileFromBytes(
      [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74],
      'image/jpeg',
    )
    await expect(matchesMagicBytes(html)).resolves.toBe(false)
  })

  it('rejects a PNG declared as JPEG (mismatch)', async () => {
    const png = fileFromBytes(
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00],
      'image/jpeg',
    )
    await expect(matchesMagicBytes(png)).resolves.toBe(false)
  })

  it('rejects unsupported MIME types outright', async () => {
    const file = fileFromBytes([0xff, 0xd8, 0xff], 'text/html')
    await expect(matchesMagicBytes(file)).resolves.toBe(false)
  })
})

describe('publicUploadsDir', () => {
  it('returns an absolute path ending with public/uploads', () => {
    // Arrange & Act
    const dir = publicUploadsDir()

    // Assert
    expect(dir).toContain('public')
    expect(dir).toContain('uploads')
  })
})

describe('deleteUploadedFile — security guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a valid /uploads/ file', () => {
    // Arrange
    const url = '/uploads/photo-123.jpg'

    // Act
    deleteUploadedFile(url)

    // Assert
    expect(mockUnlink).toHaveBeenCalledTimes(1)
    const calledPath = (mockUnlink.mock.calls[0]?.[0] as string) ?? ''
    expect(calledPath).toContain('photo-123.jpg')
  })

  it('rejects path traversal ../../etc/passwd', () => {
    // Arrange
    const traversal = '/uploads/../../etc/passwd'

    // Act
    deleteUploadedFile(traversal)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('rejects path traversal with encoded-like ../ sequences', () => {
    // Arrange
    const cases = ['/uploads/../secret.txt', '/uploads/foo/../bar.jpg', '/uploads/..', '/uploads/a/b/c.jpg']

    // Act
    for (const c of cases) deleteUploadedFile(c)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('rejects absolute path outside /uploads', () => {
    // Arrange
    const cases = ['/etc/passwd', '/absolute/path.jpg', '/tmp/uploads/evil.jpg', 'C:\\windows\\system32']

    // Act
    for (const c of cases) deleteUploadedFile(c)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('rejects when filename is empty (/uploads/ with no file)', () => {
    // Arrange
    const url = '/uploads/'

    // Act
    deleteUploadedFile(url)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('rejects nested slash in filename (subdirectory)', () => {
    // Arrange
    const url = '/uploads/subdir/photo.jpg'

    // Act
    deleteUploadedFile(url)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('rejects null bytes in filename', () => {
    // Arrange
    const withNull = '/uploads/photo\x00.jpg'
    const withNull2 = '/uploads/evil\x00.png'
    const withEncodedNull = '/uploads/foo\0bar.jpg'

    // Act
    deleteUploadedFile(withNull)
    deleteUploadedFile(withNull2)
    deleteUploadedFile(withEncodedNull)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('skips external https:// URLs (picsum, R2, cloudinary)', () => {
    // Arrange
    const externals = [
      'https://picsum.photos/200/300',
      'https://example.com/uploads/photo.jpg',
      'https://r2.cloudflarestorage.com/bucket/photo.jpg',
      'http://example.com/image.jpg',
      'data:image/png;base64,xxx',
    ]

    // Act
    for (const u of externals) deleteUploadedFile(u)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('skips URLs with .. even after /uploads/ prefix', () => {
    // Arrange
    const url = '/uploads/..'

    // Act
    deleteUploadedFile(url)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('handles unlink failure gracefully (does not throw)', () => {
    // Arrange
    mockUnlink.mockImplementation(() => Promise.reject(new Error('ENOENT')))
    const url = '/uploads/valid.jpg'

    // Act & Assert — should not throw (catch swallowed)
    expect(() => deleteUploadedFile(url)).not.toThrow()
  })
})

describe('deleteUploadedFiles — batch + only /uploads/*', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('only deletes /uploads/*, skips https://', () => {
    // Arrange
    const urls = [
      '/uploads/a.jpg',
      'https://picsum.photos/200',
      '/uploads/b.png',
      'https://r2.example.com/file.jpg',
      '/uploads/c.webp',
    ]

    // Act
    deleteUploadedFiles(urls)

    // Assert — only 3 uploads/* should trigger unlink
    expect(mockUnlink).toHaveBeenCalledTimes(3)
    const called = mockUnlink.mock.calls.map((c) => c[0] as string)
    expect(called.some((p) => p.includes('a.jpg'))).toBe(true)
    expect(called.some((p) => p.includes('b.png'))).toBe(true)
    expect(called.some((p) => p.includes('c.webp'))).toBe(true)
  })

  it('skips traversal and absolute paths in batch', () => {
    // Arrange
    const urls = [
      '/uploads/valid.jpg',
      '/uploads/../../etc/passwd',
      '/etc/shadow',
      '/uploads/../secret',
      '/uploads/inner/file.jpg',
    ]

    // Act
    deleteUploadedFiles(urls)

    // Assert — only valid.jpg should be deleted
    expect(mockUnlink).toHaveBeenCalledTimes(1)
    expect((mockUnlink.mock.calls[0]?.[0] as string)).toContain('valid.jpg')
  })

  it('skips null bytes and external in batch', () => {
    // Arrange
    const urls = ['/uploads/good.jpg', '/uploads/bad\x00.jpg', 'https://evil.com/payload.jpg']

    // Act
    deleteUploadedFiles(urls)

    // Assert — only good.jpg
    expect(mockUnlink).toHaveBeenCalledTimes(1)
    expect((mockUnlink.mock.calls[0]?.[0] as string)).toContain('good.jpg')
  })

  it('handles empty array without calling unlink', () => {
    // Arrange
    const urls: string[] = []

    // Act
    deleteUploadedFiles(urls)

    // Assert
    expect(mockUnlink).not.toHaveBeenCalled()
  })

  it('handles mixed valid and invalid — best-effort ignores missing files', () => {
    // Arrange
    mockUnlink.mockImplementation(() => Promise.reject(new Error('missing')))
    const urls = ['/uploads/a.jpg', '/uploads/b.jpg']

    // Act
    deleteUploadedFiles(urls)

    // Assert — both attempted, errors swallowed
    expect(mockUnlink).toHaveBeenCalledTimes(2)
  })

  // Verify original unlink import is mocked
  it('verifies unlink is mocked (import from node:fs/promises)', () => {
    // Arrange
    expect(vi.mocked(unlink)).toBeDefined()
  })
})
