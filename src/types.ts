export type Color = "red" | "yellow" | "green" | null;

export interface ICardSide {
  text: string;
  text2: string;
  photo: string;
}

export interface ITag {
  _id: string;
  name: string;
  color: string;
  subjectId: string;
  topicId: string;
}

export interface ICard {
  _id: string;
  subjectId: string;
  topicId: string;
  progress: Record<string, Color>;
  s1: ICardSide;
  s2: ICardSide;
  tagIds?: string[];
}

export interface ISubject {
  _id: string;
  label: string;
  parentId: string | null;
}

export interface ISession {
  subjectId: string;
  topicId: string;
  topicIds: string[];
}
