import { TFunction } from 'i18next';
import { number as numberSchema, string as stringSchema } from 'yup';

const MAX_COST = 1000000;

export const integerSchema = (t: TFunction) => {
  const msg = t('Please enter a valid integer');
  return numberSchema()
    .typeError(msg)
    .integer(msg)
    .max(MAX_COST, t(`Please enter a value smaller than {{max}}`, { max: MAX_COST }));
};

export const positiveIntegerSchema = (t: TFunction) =>
  integerSchema(t).min(0, t('Please enter a positive value'));

//support validation for DNS Subdomain Names for most CRs and RFC 1123 Label Names for namespaces
//More info in https://kubernetes.io/docs/concepts/overview/working-with-objects/names/

const NAME_START_END_REGEX = /^[a-z0-9]$/;

export enum NameValidationType {
  DNS_SUBDOMAIN = 0,
  RFC_1123_LABEL = 1,
}

const nameValidationData = {
  [NameValidationType.DNS_SUBDOMAIN]: {
    maxLength: 253,
    regex: /^[a-z0-9-.]*$/,
  },
  [NameValidationType.RFC_1123_LABEL]: {
    maxLength: 63,
    regex: /^[a-z0-9-]*$/,
  },
};

export const nameValidationMessages = (
  t: TFunction,
  type: NameValidationType = NameValidationType.DNS_SUBDOMAIN,
) => ({
  INVALID_LENGTH: t('1-{{max}} characters', { max: nameValidationData[type].maxLength }),
  NOT_UNIQUE: t('Must be unique'),
  INVALID_VALUE:
    type === NameValidationType.DNS_SUBDOMAIN
      ? t('Use lowercase alphanumeric characters, dot (.) or hyphen (-)')
      : t('Use lowercase alphanumeric characters, or hyphen (-)'),
  INVALID_START_END: t('Must start and end with an lowercase alphanumeric character'),
});

export const nameSchema = (
  t: TFunction,
  usedNames: string[] = [],
  type: NameValidationType = NameValidationType.DNS_SUBDOMAIN,
) => {
  const nameValidationMessagesList = nameValidationMessages(t, type);
  return stringSchema()
    .min(1, nameValidationMessagesList.INVALID_LENGTH)
    .max(nameValidationData[type].maxLength, nameValidationMessagesList.INVALID_LENGTH)
    .test(
      nameValidationMessagesList.INVALID_START_END,
      nameValidationMessagesList.INVALID_START_END,
      (value?: string) => {
        const trimmed = value?.trim();
        if (!trimmed) {
          return true;
        }
        return (
          !!trimmed[0].match(NAME_START_END_REGEX) &&
          (trimmed[trimmed.length - 1]
            ? !!trimmed[trimmed.length - 1].match(NAME_START_END_REGEX)
            : true)
        );
      },
    )
    .matches(nameValidationData[type].regex, {
      message: nameValidationMessagesList.INVALID_VALUE,
      excludeEmptyString: true,
    })
    .test(nameValidationMessagesList.NOT_UNIQUE, nameValidationMessagesList.NOT_UNIQUE, (value) => {
      if (!value) {
        return true;
      }
      return !usedNames.find((n) => n === value);
    });
};
