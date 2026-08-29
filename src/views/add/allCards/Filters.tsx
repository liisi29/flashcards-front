import { useEffect, useState } from "react";
import { TextSelectWithLabel } from "../../../components/TextSelectWithLabel";
import type { ISubject, ITag } from "../../../types";
import { t } from "../../../strings";
import { useTags } from "../../../contexts/TagsContext";
import { useCurrentSubject } from "../../../contexts/CurrentSubjectContext";
import { api } from "../../../api";

import styles from "./Filters.module.css";

interface IProps {
  filterTopicId: string;
  setFilterTopicId: (_id: string) => void;
  topics: ISubject[];
  filterTag: string;
  setFilterTag: (_tag: string) => void;
}

export function Filters({
  filterTopicId,
  setFilterTopicId,
  topics,
  filterTag,
  setFilterTag,
}: IProps) {
  const { reloadKey } = useTags();
  const { subjectId } = useCurrentSubject();
  const [tags, setTags] = useState<ITag[]>([]);

  useEffect(() => {
    if (!filterTopicId) {
      setTags([]);
      setFilterTag("");
      return;
    }
    api
      .getTags(subjectId, filterTopicId)
      .then(setTags)
      .catch(() => {});
  }, [subjectId, filterTopicId, reloadKey]);

  if (!subjectId) return null;

  return (
    <div className={styles.filterBar}>
      {topics.length > 0 && (
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
                style={
                  filterTag === tag._id
                    ? {
                        background: tag.color,
                        color: "#fff",
                        borderColor: tag.color,
                      }
                    : { borderColor: tag.color, color: tag.color }
                }
                onClick={() =>
                  setFilterTag(filterTag === tag._id ? "" : tag._id)
                }
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
