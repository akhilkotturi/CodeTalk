export const providerEvents = {
  attachedDocuments: [] as string[],
  destroyedDocuments: [] as string[],
  reset() {
    this.attachedDocuments = [];
    this.destroyedDocuments = [];
  },
};

export class HocuspocusProviderWebsocket {
  constructor(_configuration: unknown) {}
  destroy() {}
}

export class HocuspocusProvider {
  awareness = {};
  private name: string;

  constructor(configuration: { name?: string }) {
    this.name = configuration.name ?? "";
  }

  attach() {
    providerEvents.attachedDocuments.push(this.name);
  }

  destroy() {
    providerEvents.destroyedDocuments.push(this.name);
  }
}
