import { TextInput } from "./TextInput";
import { compressImage } from "../utils/compressImage";

interface IProps {
  title: string;
  text1: string;
  setText1: (_text: string) => void;
  text2: string;
  setText2: (_text: string) => void;
  photo: string;
  setPhoto: (_url: string) => void;
  setFile: (_file: File | null) => void;
}

export function AddSide({
  title,
  text1,
  setText1,
  text2,
  setText2,
  photo,
  setPhoto,
  setFile,
}: IProps) {
  return (
    <div className="side-section">
      <h3>{title}</h3>
      <TextInput
        placeholder="Tekst rida 1 (valikuline)"
        value={text1}
        onChange={(e) => setText1(e.target.value)}
      />
      <TextInput
        placeholder="Tekst rida 2 (valikuline)"
        value={text2}
        onChange={(e) => setText2(e.target.value)}
      />
      <label className="photo-label">
        📷 Vali foto
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0] || null;
            if (!f) return;
            const compressed = await compressImage(f);
            setFile(compressed);
            setPhoto(URL.createObjectURL(compressed));
          }}
        />
      </label>
      {photo && <img src={photo} className="photo-preview" alt="" />}
      {photo && (
        <button
          className="remove-photo"
          onClick={() => {
            setFile(null);
            setPhoto("");
          }}
        >
          ✕ Eemalda foto
        </button>
      )}
    </div>
  );
}
