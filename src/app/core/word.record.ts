export type WordTypeRaw = {
  word: string;
  translations: string[];
  status: StatusType;
  createdAt: number;
};

export type WordType = {
  id: string;
  word: string;
  translations: string[];
  translation: string;
  status: WordStatus;
  createdAt: number;
}


export function mapDoc(doc: WordTypeRaw & { id: string }) {
  return {
    id: doc.id,
    word: doc.word,
    translations: doc.translations,
    status: Status.map(doc.status),
    translation: doc.translations.join('; '),
    createdAt: doc.createdAt
  }
}

export const StatusType = {
  NEW: 0,
  LISTENING:  1,
  WORD_BUILDER:  2,
} as const;

export type StatusType = typeof StatusType[keyof typeof StatusType];

export type WordStatus = {
  new: boolean;
  done: boolean;
  inProgress: boolean;
  value: StatusType;
  binary: string;
}

export class Status {
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
  static map(value: number): WordStatus {
    const  statusNew = value === 0;
    const statusDone = Object.values(StatusType).every(status => Status.hasStatus(value as StatusType, status));
    const statusInProgress = !statusNew && !statusDone;
    return {
      new: statusNew,
      done: statusDone,
      inProgress: statusInProgress,
      binary: value.toString(2).padStart(4, '0'),
      value: value as StatusType
    }
  }
}
