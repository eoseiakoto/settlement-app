/**
 * Shared ISO 4217 currency utility.
 * Single source of truth for numeric→alpha mapping and full currency names.
 */

/* ── ISO 4217 Numeric → Alpha + Full Name ── */
const CURRENCIES = {
  '004': { alpha: 'AFN', name: 'Afghan Afghani' },
  '008': { alpha: 'ALL', name: 'Albanian Lek' },
  '012': { alpha: 'DZD', name: 'Algerian Dinar' },
  '031': { alpha: 'AZN', name: 'Azerbaijani Manat' },
  '032': { alpha: 'ARS', name: 'Argentine Peso' },
  '036': { alpha: 'AUD', name: 'Australian Dollar' },
  '044': { alpha: 'BSD', name: 'Bahamian Dollar' },
  '048': { alpha: 'BHD', name: 'Bahraini Dinar' },
  '050': { alpha: 'BDT', name: 'Bangladeshi Taka' },
  '051': { alpha: 'AMD', name: 'Armenian Dram' },
  '052': { alpha: 'BBD', name: 'Barbadian Dollar' },
  '056': { alpha: 'BEF', name: 'Belgian Franc' },
  '060': { alpha: 'BMD', name: 'Bermudian Dollar' },
  '064': { alpha: 'BTN', name: 'Bhutanese Ngultrum' },
  '068': { alpha: 'BOB', name: 'Bolivian Boliviano' },
  '072': { alpha: 'BWP', name: 'Botswana Pula' },
  '084': { alpha: 'BZD', name: 'Belize Dollar' },
  '090': { alpha: 'SBD', name: 'Solomon Islands Dollar' },
  '096': { alpha: 'BND', name: 'Brunei Dollar' },
  '104': { alpha: 'MMK', name: 'Myanmar Kyat' },
  '108': { alpha: 'BIF', name: 'Burundian Franc' },
  '116': { alpha: 'KHR', name: 'Cambodian Riel' },
  '124': { alpha: 'CAD', name: 'Canadian Dollar' },
  '132': { alpha: 'CVE', name: 'Cape Verdean Escudo' },
  '136': { alpha: 'KYD', name: 'Cayman Islands Dollar' },
  '144': { alpha: 'LKR', name: 'Sri Lankan Rupee' },
  '152': { alpha: 'CLP', name: 'Chilean Peso' },
  '156': { alpha: 'CNY', name: 'Chinese Yuan' },
  '170': { alpha: 'COP', name: 'Colombian Peso' },
  '174': { alpha: 'KMF', name: 'Comorian Franc' },
  '188': { alpha: 'CRC', name: 'Costa Rican Colon' },
  '191': { alpha: 'HRK', name: 'Croatian Kuna' },
  '192': { alpha: 'CUP', name: 'Cuban Peso' },
  '203': { alpha: 'CZK', name: 'Czech Koruna' },
  '208': { alpha: 'DKK', name: 'Danish Krone' },
  '214': { alpha: 'DOP', name: 'Dominican Peso' },
  '222': { alpha: 'SVC', name: 'Salvadoran Colon' },
  '230': { alpha: 'ETB', name: 'Ethiopian Birr' },
  '232': { alpha: 'ERN', name: 'Eritrean Nakfa' },
  '238': { alpha: 'FKP', name: 'Falkland Islands Pound' },
  '242': { alpha: 'FJD', name: 'Fijian Dollar' },
  '262': { alpha: 'DJF', name: 'Djiboutian Franc' },
  '270': { alpha: 'GMD', name: 'Gambian Dalasi' },
  '292': { alpha: 'GIP', name: 'Gibraltar Pound' },
  '320': { alpha: 'GTQ', name: 'Guatemalan Quetzal' },
  '324': { alpha: 'GNF', name: 'Guinean Franc' },
  '328': { alpha: 'GYD', name: 'Guyanese Dollar' },
  '332': { alpha: 'HTG', name: 'Haitian Gourde' },
  '340': { alpha: 'HNL', name: 'Honduran Lempira' },
  '344': { alpha: 'HKD', name: 'Hong Kong Dollar' },
  '348': { alpha: 'HUF', name: 'Hungarian Forint' },
  '352': { alpha: 'ISK', name: 'Icelandic Krona' },
  '356': { alpha: 'INR', name: 'Indian Rupee' },
  '360': { alpha: 'IDR', name: 'Indonesian Rupiah' },
  '364': { alpha: 'IRR', name: 'Iranian Rial' },
  '368': { alpha: 'IQD', name: 'Iraqi Dinar' },
  '376': { alpha: 'ILS', name: 'Israeli Shekel' },
  '388': { alpha: 'JMD', name: 'Jamaican Dollar' },
  '392': { alpha: 'JPY', name: 'Japanese Yen' },
  '398': { alpha: 'KZT', name: 'Kazakhstani Tenge' },
  '400': { alpha: 'JOD', name: 'Jordanian Dinar' },
  '404': { alpha: 'KES', name: 'Kenyan Shilling' },
  '408': { alpha: 'KPW', name: 'North Korean Won' },
  '410': { alpha: 'KRW', name: 'South Korean Won' },
  '414': { alpha: 'KWD', name: 'Kuwaiti Dinar' },
  '417': { alpha: 'KGS', name: 'Kyrgystani Som' },
  '418': { alpha: 'LAK', name: 'Lao Kip' },
  '422': { alpha: 'LBP', name: 'Lebanese Pound' },
  '426': { alpha: 'LSL', name: 'Lesotho Loti' },
  '430': { alpha: 'LRD', name: 'Liberian Dollar' },
  '434': { alpha: 'LYD', name: 'Libyan Dinar' },
  '446': { alpha: 'MOP', name: 'Macanese Pataca' },
  '454': { alpha: 'MWK', name: 'Malawian Kwacha' },
  '458': { alpha: 'MYR', name: 'Malaysian Ringgit' },
  '462': { alpha: 'MVR', name: 'Maldivian Rufiyaa' },
  '478': { alpha: 'MRO', name: 'Mauritanian Ouguiya (old)' },
  '480': { alpha: 'MUR', name: 'Mauritian Rupee' },
  '484': { alpha: 'MXN', name: 'Mexican Peso' },
  '496': { alpha: 'MNT', name: 'Mongolian Tugrik' },
  '498': { alpha: 'MDL', name: 'Moldovan Leu' },
  '504': { alpha: 'MAD', name: 'Moroccan Dirham' },
  '508': { alpha: 'MZN', name: 'Mozambican Metical' },
  '512': { alpha: 'OMR', name: 'Omani Rial' },
  '516': { alpha: 'NAD', name: 'Namibian Dollar' },
  '524': { alpha: 'NPR', name: 'Nepalese Rupee' },
  '532': { alpha: 'ANG', name: 'Netherlands Antillean Guilder' },
  '533': { alpha: 'AWG', name: 'Aruban Florin' },
  '548': { alpha: 'VUV', name: 'Vanuatu Vatu' },
  '554': { alpha: 'NZD', name: 'New Zealand Dollar' },
  '558': { alpha: 'NIO', name: 'Nicaraguan Cordoba' },
  '566': { alpha: 'NGN', name: 'Nigerian Naira' },
  '578': { alpha: 'NOK', name: 'Norwegian Krone' },
  '586': { alpha: 'PKR', name: 'Pakistani Rupee' },
  '590': { alpha: 'PAB', name: 'Panamanian Balboa' },
  '598': { alpha: 'PGK', name: 'Papua New Guinean Kina' },
  '600': { alpha: 'PYG', name: 'Paraguayan Guarani' },
  '604': { alpha: 'PEN', name: 'Peruvian Sol' },
  '608': { alpha: 'PHP', name: 'Philippine Peso' },
  '634': { alpha: 'QAR', name: 'Qatari Riyal' },
  '643': { alpha: 'RUB', name: 'Russian Ruble' },
  '646': { alpha: 'RWF', name: 'Rwandan Franc' },
  '654': { alpha: 'SHP', name: 'Saint Helena Pound' },
  '678': { alpha: 'STD', name: 'Sao Tome Dobra (old)' },
  '682': { alpha: 'SAR', name: 'Saudi Riyal' },
  '690': { alpha: 'SCR', name: 'Seychellois Rupee' },
  '694': { alpha: 'SLL', name: 'Sierra Leonean Leone' },
  '702': { alpha: 'SGD', name: 'Singapore Dollar' },
  '704': { alpha: 'VND', name: 'Vietnamese Dong' },
  '706': { alpha: 'SOS', name: 'Somali Shilling' },
  '710': { alpha: 'ZAR', name: 'South African Rand' },
  '716': { alpha: 'ZWD', name: 'Zimbabwean Dollar (old)' },
  '748': { alpha: 'SZL', name: 'Eswatini Lilangeni' },
  '752': { alpha: 'SEK', name: 'Swedish Krona' },
  '756': { alpha: 'CHF', name: 'Swiss Franc' },
  '760': { alpha: 'SYP', name: 'Syrian Pound' },
  '764': { alpha: 'THB', name: 'Thai Baht' },
  '776': { alpha: 'TOP', name: 'Tongan Pa\'anga' },
  '780': { alpha: 'TTD', name: 'Trinidad and Tobago Dollar' },
  '784': { alpha: 'AED', name: 'UAE Dirham' },
  '788': { alpha: 'TND', name: 'Tunisian Dinar' },
  '800': { alpha: 'UGX', name: 'Ugandan Shilling' },
  '807': { alpha: 'MKD', name: 'Macedonian Denar' },
  '818': { alpha: 'EGP', name: 'Egyptian Pound' },
  '826': { alpha: 'GBP', name: 'British Pound Sterling' },
  '834': { alpha: 'TZS', name: 'Tanzanian Shilling' },
  '840': { alpha: 'USD', name: 'US Dollar' },
  '858': { alpha: 'UYU', name: 'Uruguayan Peso' },
  '860': { alpha: 'UZS', name: 'Uzbekistani Som' },
  '882': { alpha: 'WST', name: 'Samoan Tala' },
  '886': { alpha: 'YER', name: 'Yemeni Rial' },
  '901': { alpha: 'TWD', name: 'New Taiwan Dollar' },
  '928': { alpha: 'VES', name: 'Venezuelan Bolivar' },
  '929': { alpha: 'MRU', name: 'Mauritanian Ouguiya' },
  '930': { alpha: 'STN', name: 'Sao Tome Dobra' },
  '932': { alpha: 'ZWL', name: 'Zimbabwean Dollar' },
  '933': { alpha: 'BYN', name: 'Belarusian Ruble' },
  '934': { alpha: 'TMT', name: 'Turkmenistani Manat' },
  '936': { alpha: 'GHS', name: 'Ghana Cedi' },
  '938': { alpha: 'SDG', name: 'Sudanese Pound' },
  '941': { alpha: 'RSD', name: 'Serbian Dinar' },
  '943': { alpha: 'MZN', name: 'Mozambican Metical' },
  '944': { alpha: 'AZN', name: 'Azerbaijani Manat' },
  '946': { alpha: 'RON', name: 'Romanian Leu' },
  '947': { alpha: 'CHE', name: 'WIR Euro' },
  '949': { alpha: 'TRY', name: 'Turkish Lira' },
  '950': { alpha: 'XAF', name: 'Central African CFA Franc' },
  '951': { alpha: 'XCD', name: 'East Caribbean Dollar' },
  '952': { alpha: 'XOF', name: 'West African CFA Franc' },
  '953': { alpha: 'XPF', name: 'CFP Franc' },
  '960': { alpha: 'XDR', name: 'Special Drawing Rights' },
  '967': { alpha: 'ZMW', name: 'Zambian Kwacha' },
  '968': { alpha: 'SRD', name: 'Surinamese Dollar' },
  '969': { alpha: 'MGA', name: 'Malagasy Ariary' },
  '971': { alpha: 'AFN', name: 'Afghan Afghani' },
  '972': { alpha: 'TJS', name: 'Tajikistani Somoni' },
  '973': { alpha: 'AOA', name: 'Angolan Kwanza' },
  '975': { alpha: 'BGN', name: 'Bulgarian Lev' },
  '976': { alpha: 'CDF', name: 'Congolese Franc' },
  '977': { alpha: 'BAM', name: 'Bosnia-Herzegovina Mark' },
  '978': { alpha: 'EUR', name: 'Euro' },
  '980': { alpha: 'UAH', name: 'Ukrainian Hryvnia' },
  '981': { alpha: 'GEL', name: 'Georgian Lari' },
  '985': { alpha: 'PLN', name: 'Polish Zloty' },
  '986': { alpha: 'BRL', name: 'Brazilian Real' },
};

/* ── Build fast lookup maps ── */
const NUMERIC_TO_ALPHA = {};
const ALPHA_TO_NAME = {};

for (const [num, { alpha, name }] of Object.entries(CURRENCIES)) {
  NUMERIC_TO_ALPHA[num] = alpha;
  // Use first entry for each alpha code (avoids duplicate overwrite)
  if (!ALPHA_TO_NAME[alpha]) {
    ALPHA_TO_NAME[alpha] = name;
  }
}

/**
 * Convert ISO 4217 numeric code to alpha code.
 * Returns the input unchanged if not found (handles alpha codes passed directly).
 */
export function numericToAlpha(code) {
  if (!code) return '-';
  return NUMERIC_TO_ALPHA[code] || code;
}

/**
 * Get full currency name from alpha code.
 * e.g. 'USD' → 'US Dollar', 'GHS' → 'Ghana Cedi'
 */
export function getCurrencyName(alphaCode) {
  return ALPHA_TO_NAME[alphaCode] || alphaCode;
}

/**
 * Format currency for dropdown display: "USD — US Dollar"
 */
export function currencyOption(alphaCode) {
  const name = ALPHA_TO_NAME[alphaCode];
  return name ? `${alphaCode} — ${name}` : alphaCode;
}

/**
 * All alpha→name entries (for iteration).
 */
export const CURRENCY_NAMES = ALPHA_TO_NAME;

/**
 * Preferred currencies shown at top of dropdowns.
 */
export const PREFERRED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'GHS', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR',
  'AED', 'SAR', 'NGN', 'ZAR', 'KES', 'BRL', 'MXN', 'SGD', 'HKD',
];
