import { TextSelectWithLabel } from "../../components/TextSelectWithLabel";
import type { Subject } from "../../types";
import { t } from "../../strings";

import styles from "./Filters.module.css";

interface IProps {
  filterSubjectId: string;
  setFilterSubjectId: (_id: string) => void;
  filterTopicId: string;
  setFilterTopicId: (_id: string) => void;
  subjects: Subject[];
  topics: Subject[];
}

export function Filters({
  filterSubjectId,
  setFilterSubjectId,
  filterTopicId,
  setFilterTopicId,
  subjects,
  topics,
}: IProps) {
  return (
    <div className={styles["filter-bar"]}>
      <TextSelectWithLabel
        label={t.filterSubject}
        value={filterSubjectId}
        onChange={(e) => {
          setFilterSubjectId(e.target.value);
          setFilterTopicId("");
        }}
        options={subjects}
        noneLabel={t.allSubjects}
      />

      {filterSubjectId && topics.length > 0 && (
        <TextSelectWithLabel
          label={t.filterTopic}
          value={filterTopicId}
          onChange={(e) => setFilterTopicId(e.target.value)}
          options={topics}
          noneLabel={t.allTopics}
        />
      )}
    </div>
  );
}
