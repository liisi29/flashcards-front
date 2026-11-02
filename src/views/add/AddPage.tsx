import { useEffect, useRef, useState } from "react";
import type { ISubject } from "../../types";
import { api } from "../../api";
import { AllCards } from "./allCards/AllCards";
import { AddSection } from "./AddSection";
import { BulkAddSection } from "./BulkAddSection";
import { Collapsible } from "../../components/Collapsible";
import { SubjectSelect } from "../../components/SubjectSelect";
import { TagInput } from "../../components/TagInput";
import { useCurrentSubject } from "../../contexts/CurrentSubjectContext";
import { t } from "../../strings";
import styles from "./AddPage.module.css";

interface Props {
  onLearn: () => void;
}

type AddMode = "one" | "list";
const MODE_KEY = "add-mode";

function readMode(): AddMode {
  try {
    return localStorage.getItem(MODE_KEY) === "list" ? "list" : "one";
  } catch {
    return "one";
  }
}

export default function Main({ onLearn }: Props) {
  const notifyCardAdded = useRef<(() => void) | null>(null);
  const notify = () => notifyCardAdded.current?.();

  // topic + tags are picked once here and shared by both add modes
  const { subjectId } = useCurrentSubject();
  const [topics, setTopics] = useState<ISubject[]>([]);
  const [topicId, setTopicId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [mode, setModeState] = useState<AddMode>(readMode);

  function setMode(m: AddMode) {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setTopicId("");
    setTagIds([]);
    if (!subjectId) {
      setTopics([]);
      return;
    }
    api
      .getTopics(subjectId)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [subjectId]);

  return (
    <div id="app">
      <div className={styles.addWrap}>
        <Collapsible title={t.headingAdd} storageKey="add-forms">
          {!subjectId ? (
            <p className="status">{t.pickSubjectFirst}</p>
          ) : (
            <div className={styles.addCol}>
              <div className="side-section">
                <SubjectSelect
                  label={t.addTopic}
                  subjects={topics}
                  value={topicId}
                  onChange={(id: string) => {
                    setTopicId(id);
                    setTagIds([]); // tags belong to a topic
                  }}
                  onCreated={(s) => {
                    setTopics((prev) => [...prev, s]);
                    setTopicId(s._id);
                    setTagIds([]);
                  }}
                  onCreate={(label) => api.createSubject(label, subjectId)}
                  placeholder={t.placeholderTopic}
                  newPlaceholder={t.placeholderNewTopic}
                />
              </div>

              <TagInput
                tagIds={tagIds}
                subjectId={subjectId}
                topicId={topicId}
                onChange={setTagIds}
              />

              <div className={styles.modeSwitch} role="tablist">
                <button
                  role="tab"
                  aria-selected={mode === "one"}
                  className={`${styles.modeBtn}${mode === "one" ? ` ${styles.modeOn}` : ""}`}
                  onClick={() => setMode("one")}
                >
                  {t.addModeOne}
                </button>
                <button
                  role="tab"
                  aria-selected={mode === "list"}
                  className={`${styles.modeBtn}${mode === "list" ? ` ${styles.modeOn}` : ""}`}
                  onClick={() => setMode("list")}
                >
                  {t.addModeList}
                </button>
              </div>

              {mode === "one" ? (
                <AddSection
                  topicId={topicId}
                  tagIds={tagIds}
                  onCardAdded={notify}
                />
              ) : (
                <BulkAddSection
                  topicId={topicId}
                  tagIds={tagIds}
                  onCardAdded={notify}
                />
              )}
            </div>
          )}
        </Collapsible>
      </div>

      <AllCards
        onLearn={onLearn}
        registerCardAddedNotifier={(fn) => {
          notifyCardAdded.current = fn;
        }}
      />
    </div>
  );
}
