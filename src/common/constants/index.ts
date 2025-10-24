/* eslint-disable no-useless-escape */
export const REQUEST_USER_KEY = 'user';
export const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24;
export const COOKIE_SECURE = false;
export const ISSUER = 'https://www.linkedin.com/oauth';
export const AUTHORIZATION_URL =
  'https://www.linkedin.com/oauth/v2/authorization';
export const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
export const USER_INFO_URL = 'https://api.linkedin.com/v2/userinfo';
export const BASE64_PATTERN = /^image\/(png|jpg|jpeg);base64,/;
export const patterns = {
  age: /Вік[:\s]*(\d+)/i,
  sex: /Стать[:\s]*(чоловіча|жіноча)/i,
  dob: /народження[:\s]*(\d{2}\.\d{2}\.\d{4})/i,

  triglycerides: /Триг[лі]+[цс]ериди[:\s]*([\d.,]+)/i,
  cholesterol: /Холестерин[:\s]*([\d.,]+)/i,
  hdl: /HDL[:\s]*([\d.,]+)/i,
  ldl: /LDL[:\s]*([\d.,]+)/i,
  vldl: /VLDL[:\s]*([\d.,]+)/i,
  atherogenicCoeff: /атерогенності[:\s]*([\d.,]+)/i,

  wbc: /WBC[:\s]*([\d.,]+)/i,
  rbc: /RBC[:\s]*([\d.,]+)/i,
  hemoglobin: /[Гг]емоглобі?н[:\s]*([\d.,]+)/i,
  hematocrit: /[Гг]ематокрит[:\s]*([\d.,]+)/i,
  mcv: /MCV[:\s]*([\d.,]+)/i,
  mch: /MCH[:\s]*([\d.,]+)/i,
  mchc: /MCHC[:\s]*([\d.,]+)/i,
  plt: /PLT[:\s]*([\d.,]+)/i,
  rdwsd: /RDW-SD[:\s]*([\d.,]+)/i,
  rdwcv: /RDW-CV[:\s]*([\d.,]+)/i,
  pdw: /PDW[:\s]*([\d.,]+)/i,
  mpv: /MPV[:\s]*([\d.,]+)/i,

  neutrophils: /[Нн]ейтрофіли?[:\s\(]*[бБ]?[Еє]?[Кк]?[:\s\)]*([\d.,]+)/i,
  lymphocytes: /[Лл]імфоцити[:\s\(]*[аА]?[бБ]?[сС]?[:\s\)]*([\d.,]+)/i,
  monocytes: /[Мм]оноцити[:\s\(]*[аА]?[бБ]?[сС]?[:\s\)]*([\d.,]+)/i,
  eosinophils: /[Ее]озинофіл[иі][:\s(]*[аА]?[бБ]?[сС]?[:\s)]*([\d.,]+)/i,
  basophils: /[Бб]азофіл[иі][:\s\(]*[аА]?[бБ]?[сС]?[:\s\)]*([\d.,]+)/i,

  glucose: /[ШЩ][ОоYУу][ДдDОо][ЕеEЗз][:\s]*([\d.,]+)/i,
  creatinine: /[Кк]реатинін[:\s]*([\d.,]+)/i,
  uricAcid: /[Сс]ечова кислота[:\s]*([\d.,]+)/i,
  totalBilirubin: /[Зз]агальний білірубін[:\s]*([\d.,]+)/i,
  directBilirubin: /[Пп]рямий білірубін[:\s]*([\d.,]+)/i,
  alt: /[Аа]ланінамінотрансфераза[:\s]*([\d.,]+)/i,
  ast: /[Аа]спартатамінотрансфераза[:\s]*([\d.,]+)/i,
  ggt: /[Гг]амаглутамілтрансфераза[:\s]*([\d.,]+)/i,
  alp: /[Лл]ужна фосфатаза[:\s]*([\d.,]+)/i,
  albumin: /[Аа]льбумі?н[:\s]*([\d.,]+)/i,
};
