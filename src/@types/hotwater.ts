export interface HotwaterConfig{
    name: string;
    periodlength:number;
    nightstarthour:number;
    nightendhour:number;
    nighttargettemperature:number;
    minimaltemperature:number,
    maximaltemperature:number,
    increasetemperatureperhour:number,
    decreasetemperatureperhour:number,
    designtemperature?:number;
}