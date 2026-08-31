import { downloadFile } from './download-file';

describe('downloadFile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('downloads the supplied contents with the requested filename and type', () => {
    const blob = {} as Blob;
    const blobConstructor = vi.fn(function () {
      return blob;
    });
    vi.stubGlobal('Blob', blobConstructor);
    const anchor = document.createElement('a');
    const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const createObjectURLSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});

    downloadFile('contents', 'cluster.yaml', 'application/yaml');

    expect(blobConstructor).toHaveBeenCalledWith(['contents'], {
      type: 'application/yaml',
    });
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(anchor.href).toContain('blob:test');
    expect(anchor.download).toBe('cluster.yaml');
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');
  });

  it('revokes the object URL when triggering the download fails', () => {
    vi.stubGlobal(
      'Blob',
      vi.fn(function () {
        return {} as Blob;
      }),
    );
    const anchor = document.createElement('a');
    vi.spyOn(anchor, 'click').mockImplementation(() => {
      throw new Error('click failed');
    });
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURLSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});

    expect(() =>
      downloadFile('contents', 'cluster.yaml', 'application/yaml'),
    ).toThrow('click failed');
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');
  });
});
