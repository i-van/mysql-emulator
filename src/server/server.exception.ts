type Options = {
  message: string;
  code: string;
  [k: string]: any;
};

export class ServerException extends Error {
  public code: string;
  public data: object;

  constructor({ message, code, ...data }: Options) {
    super(message);
    this.code = code;
    this.data = data;
  }
}
