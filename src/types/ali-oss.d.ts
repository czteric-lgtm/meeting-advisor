declare module "ali-oss" {
  interface OSSConfig {
    region: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    endpoint?: string;
    secure?: boolean;
  }

  interface PutOptions {
    headers?: Record<string, string>;
  }

  interface ListOptions {
    prefix?: string;
    "max-keys"?: number;
  }

  interface OSSObject {
    name: string;
    size: number;
    lastModified: string;
  }

  interface ListResult {
    objects?: OSSObject[];
  }

  interface SignatureUrlOptions {
    expires?: number;
  }

  class OSS {
    constructor(config: OSSConfig);
    put(key: string, buffer: Buffer, options?: PutOptions): Promise<{ url?: string }>;
    delete(key: string): Promise<void>;
    list(options: ListOptions): Promise<ListResult>;
    signatureUrl(key: string, options?: SignatureUrlOptions): string;
  }

  export default OSS;
}
