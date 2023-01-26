import { dump, load } from 'js-yaml';
import {
  ClusterTemplateInstancePropertyValue,
  ClusterTemplate,
  ClusterTemplateInstance,
  ClusterTemplateStatus,
} from '../types';
import { clusterTemplateInstanceGVK } from '../constants';
import { getApiVersion } from './k8s';

const getProperties = (
  valuesStr: string,
  clusterSetupName?: string,
): ClusterTemplateInstancePropertyValue[] => {
  try {
    const valuesObject = load(valuesStr) as Record<string, string>;
    if (!valuesObject) {
      return [];
    }
    return Object.entries(valuesObject).map(([key, value]) => ({
      clusterSetup: clusterSetupName,
      name: key,
      value,
    }));
  } catch (err) {
    // t("Failed to parse values of chart {{chart}}")
    throw new Error(`Failed to parse values of chart ${clusterSetupName || ''}`);
  }
};

const getAllProperties = (
  status: ClusterTemplateStatus,
): ClusterTemplateInstancePropertyValue[] => {
  const clusterDefinitionProperties = getProperties(status.clusterDefinition.values);
  if (!status.clusterSetup) {
    return clusterDefinitionProperties;
  }
  return status.clusterSetup.reduce(
    (properties, { values, name }) => [...properties, ...getProperties(values, name)],
    clusterDefinitionProperties,
  );
};

const getInstanceObject = (clusterTemplate: ClusterTemplate): ClusterTemplateInstance => {
  if (!clusterTemplate.status) {
    // t("Cluster template doesn't contain a status")
    throw new Error("Cluster template doesn't contain a status");
  }
  const values = getAllProperties(clusterTemplate.status);
  return {
    apiVersion: getApiVersion(clusterTemplateInstanceGVK),
    kind: clusterTemplateInstanceGVK.kind,
    metadata: {
      namespace: undefined,
      name: undefined,
    },
    spec: {
      clusterTemplateRef: clusterTemplate.metadata?.name || '',
      values: values.length ? values : undefined,
    },
  };
};

const generateInstanceYaml = (clusterTemplate: ClusterTemplate): string => {
  const object = getInstanceObject(clusterTemplate);
  const yaml = dump(object);
  return yaml;
};

export default generateInstanceYaml;
