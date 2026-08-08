export type PrivateObject = {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
  etag: string;
};

export type PrivateObjectMetadata = Omit<PrivateObject, "stream">;

export interface PrivateStorageAdapter {
  get(objectKey: string): Promise<PrivateObject | null>;
  head(objectKey: string): Promise<PrivateObjectMetadata | null>;
  delete(objectKey: string): Promise<void>;
  listKeys(prefix: string): Promise<string[]>;
}
