import { TextSelectWithLabel } from "../../../components/TextSelectWithLabel";
import type { ISubject } from "../../../types";
import { t } from "../../../strings";
import { useTags } from "../../../contexts/TagsContext";

import styles from "./Filters.module.css";

interface IProps {
  filterSubjectId: string;
  setFilterSubjectId: (_id: string) => void;
  filterTopicId: string;
  setFilterTopicId: (_id: string) => void;
  subjects: ISubject[];
  topics: ISubject[];
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
  filterTag,
  setFilterTag,
}: IProps) {
  const { tags } = useTags();

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

      {tags.length > 0 && (
        <div className={styles.tagFilterRow}>
          <label className={styles.tagFilterLabel}>{t.filterTags}</label>
          <div className={styles.tagChips}>
            <button
              className={`${styles.filterChip}${filterTag === "" ? ` ${styles.active}` : ""}`}
              onClick={() => setFilterTag("")}
            >
              {t.allTags}
            </button>
            {tags.map((tag) => (
              <button
                key={tag._id}
                className={styles.filterChip}
                style={filterTag === tag._id
                  ? { background: tag.color, color: "#fff", borderColor: tag.color }
                  : { borderColor: tag.color, color: tag.color }}
                onClick={() => setFilterTag(filterTag === tag._id ? "" : tag._id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
