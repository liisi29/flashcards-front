import { TextInput } from "./TextInput";

interface IProps {
    title: string;
    text1: string;
    setText1: (text: string) => void;
    text2: string;
    setText2: (text: string) => void;
    photo: string;
    setPhoto: (url: string) => void;
    setFile: (file: File | null) => void;
}

export function AddSide({ title, text1, 
    setText1, 
    text2, 
    setText2, 
    photo, 
    setPhoto,  
    setFile }: IProps) {
    return <div className="side-section">
        <h3>{title}</h3>
        <TextInput 
        placeholder="Tekst rida 1 (valikuline)" 
        value={text1} 
        onChange={(e) => setText1(e.target.value)} />
        <TextInput 
        placeholder="Tekst rida 2 (valikuline)"
        value={text2}
        onChange={(e) => setText2(e.target.value)} />
        <label className="photo-label">
        📷 Vali foto
        <input type="file" accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            if (f) { 
                setPhoto(URL.createObjectURL(f)); 
            };
        }} />
        </label>
        {photo && <img src={photo} className="photo-preview" alt="" />}
        {photo && <button className="remove-photo" 
        onClick={() => { setFile(null); setPhoto(''); }}>✕ Eemalda foto</button>}
        </div>
}