import { publicHttpUrlError } from './url-rules';

describe('public HTTP URL rules', () => {
  it('rejects malformed, credentialed, and private targets', () => {
    expect(publicHttpUrlError('not a url')).toBe('url');
    expect(publicHttpUrlError('ftp://example.com')).toBe('url');
    expect(publicHttpUrlError('http://user:pass@example.com')).toBe('private');
    expect(publicHttpUrlError('http://localhost/admin')).toBe('private');
    expect(publicHttpUrlError('http://127.0.0.1/latest')).toBe('private');
    expect(publicHttpUrlError('http://10.0.0.8')).toBe('private');
    expect(publicHttpUrlError('http://192.168.1.20')).toBe('private');
    expect(publicHttpUrlError('http://169.254.169.254/metadata')).toBe('private');
    expect(publicHttpUrlError('http://metadata.google.internal/')).toBe('private');
  });

  it('accepts public http and https names', () => {
    expect(publicHttpUrlError('https://example.com/health')).toBeNull();
    expect(publicHttpUrlError('http://example.com')).toBeNull();
  });
});
