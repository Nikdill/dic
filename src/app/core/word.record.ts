export type RecordTypeRaw = {
  word: string;
  translations: string[];
  status: StatusType;
  createdAt: number;
};

export type RecordType = {
  id: string;
  word: string;
  translations: string[];
  translation: string;
  status: Status;
  createdAt: number;
}


export function mapDoc(doc: RecordTypeRaw & { id: string }) {
  return {
    id: doc.id,
    word: doc.word,
    translations: doc.translations,
    status: new Status(doc.status),
    translation: doc.translations.join('; '),
    createdAt: doc.createdAt
  }
}

export const StatusType = {
  NEW:   0,
  WORD_TRANSLATION:  1,
} as const;

export type StatusType = typeof StatusType[keyof typeof StatusType]

export class Status {
  private readonly statusValue: number;

  get value() {
    return this.statusValue as StatusType;
  }

  // Показать права в двоичном виде (для отладки)
  get binary() {
    return this.statusValue.toString(2).padStart(4, '0');
  }

  get new() {
    return this.statusValue
  }

  get done() {
    return Object.values(StatusType).every(status => Status.hasStatus(this.value, status))
  }

  get inProgress() {
    return !this.done;
  }

  constructor(status: StatusType) {
    this.statusValue = status as number;
  }

  // Добавить право
  static addStatus(value: StatusType, status: StatusType) {// Побитовое ИЛИ
    return value | status;
  }

  // Удалить право
  static removeStatus(value: StatusType,status: StatusType) {
    // Побитовое И с инверсией
    return value & ~status;
  }

  // Проверить наличие права
  static hasStatus(value: StatusType, status: StatusType) {
    return (value & status) === status;
  }
}
