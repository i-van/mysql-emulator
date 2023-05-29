type Options = {
  message: string;
  code: string;
};

export class ServerException extends Error {
  public code: string;

  constructor({ message, code }: Options) {
    super(message);
    this.code = code;
  }
}
