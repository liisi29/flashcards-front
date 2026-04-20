import { TextSelectWithLabel } from "../../../components/TextSelectWithLabel";
import type { ISubject } from "../../../types";
import { t } from "../../../strings";

import styles from "./Filters.module.css";

interface IProps {
  filterSubjectId: string;
  setFilterSubjectId: (_id: string) => void;
  filterTopicId: string;
  setFilterTopicId: (_id: string) => void;
  subjects: ISubject[];
  topics: ISubject[];
  allTags: string[];
  filterTag: string;
  setFilterTag: (_tag: string) => void;
}

export function Filters({
  filterSubjectId,
  setFilterSubjectId,
  filterTopicId,
  setFilterTopicId,
  subjects,
  topics,
  allTags,
  filterTag,
  setFilterTag,
}: IProps) {
  return (
    <div className={styles.filterBar}>
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

      {allTags.length > 0 && (
        <div className={styles.tagFilterRow}>
          <label className={styles.tagFilterLabel}>{t.filterTags}</label>
          <div className={styles.tagChips}>
            <button
              className={`${styles.filterChip}${filterTag === "" ? ` ${styles.active}` : ""}`}
              onClick={() => setFilterTag("")}
            >
              {t.allTags}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`${styles.filterChip}${filterTag === tag ? ` ${styles.active}` : ""}`}
                onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
