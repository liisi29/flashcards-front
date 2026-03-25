import { TextSelect } from "./TextSelect";


export function TextSelectWithLabel({
  label,
  value,
  noneLabel = '-- Vali --',
  onChange,
  options,
}: {
    label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { _id: string; label: string }[];
  noneLabel: string;
}) {
  return (
     <div className="learn-config-row">
                <label>{label}</label>
                <TextSelect
                  value={value}
                  onChange={onChange}
                  options={options}
                  noneLabel={noneLabel}
                />
              </div>
         
  );
}