import { TextSelectWithLabel } from "../../components/TextSelectWithLabel";
import { USERS, type Subject } from "../../types";

import styles from "./Filters.module.css";

interface IProps {
  filterSubjectId: string;
  setFilterSubjectId: (_id: string) => void;
  filterTopicId: string;
  setFilterTopicId: (_id: string) => void;
  filterViewer: string;
  setFilterViewer: (_viewer: string) => void;
  subjects: Subject[];
  topics: Subject[];
}

export function Filters({
  filterSubjectId,
  setFilterSubjectId,
  filterTopicId,
  setFilterTopicId,
  filterViewer,
  setFilterViewer,
  subjects,
  topics,
}: IProps) {
  return (
    <div className={styles["filter-bar"]}>
      <TextSelectWithLabel
        label={"Filtreeri teema"}
        value={filterSubjectId}
        onChange={(e) => {
          setFilterSubjectId(e.target.value);
          setFilterTopicId("");
        }}
        options={subjects}
        noneLabel="Kõik teemad"
      />

      {filterSubjectId && topics.length > 0 && (
        <TextSelectWithLabel
          label={"Filtreeri alamteema"}
          value={filterTopicId}
          onChange={(e) => setFilterTopicId(e.target.value)}
          options={topics}
          noneLabel="Kõik alamteemad"
        />
      )}

      <TextSelectWithLabel
        label={"Filtreeri, kes näeb"}
        value={filterViewer}
        onChange={(e) => setFilterViewer(e.target.value)}
        options={USERS.map((u) => ({ _id: u, label: u }))}
        noneLabel="Kõik kasutajad"
      />
    </div>
  );
}
