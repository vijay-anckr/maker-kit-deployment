import { collection, config, fields } from '@keystatic/core';
import { Entry } from '@keystatic/core/reader';

import { KeystaticStorage } from './keystatic-storage';

export const keyStaticConfig = createKeyStaticConfig(
  process.env.NEXT_PUBLIC_KEYSTATIC_CONTENT_PATH ?? '',
);

function getContentField() {
  return fields.markdoc({
    label: 'Content',
    options: {
      link: true,
      blockquote: true,
      bold: true,
      divider: true,
      orderedList: true,
      unorderedList: true,
      strikethrough: true,
      heading: true,
      code: true,
      italic: true,
      image: {
        directory: 'public/site/images',
        publicPath: '/site/images',
        schema: {
          title: fields.text({
            label: 'Caption',
            description: 'The text to display under the image in a caption.',
          }),
        },
      },
    },
  });
}

export type PostEntryProps = Entry<
  (typeof keyStaticConfig)['collections']['posts']
>;

export type DocumentationEntryProps = Entry<
  (typeof keyStaticConfig)['collections']['documentation']
>;

function createKeyStaticConfig(path = '') {
  if (path && !path.endsWith('/')) {
    path += '/';
  }

  const cloud = {
    project: KeystaticStorage.kind === 'cloud' ? KeystaticStorage.project : '',
  };

  const collections = getKeystaticCollections(path);

  return config({
    storage: KeystaticStorage,
    cloud,
    collections,
  });
}

function getKeystaticCollections(path: string) {
  return {
    posts: collection({
      label: 'Posts',
      slugField: 'title',
      path: `${path}posts/*`,
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        label: fields.text({
          label: 'Label',
          validation: { isRequired: false },
        }),
        image: fields.image({
          label: 'Image',
          directory: 'public/site/images',
          publicPath: '/site/images',
        }),
        categories: fields.array(fields.text({ label: 'Category' })),
        tags: fields.array(fields.text({ label: 'Tag' })),
        description: fields.text({ label: 'Description' }),
        publishedAt: fields.date({ label: 'Published At' }),
        parent: fields.relationship({
          label: 'Parent',
          collection: 'posts',
        }),
        language: fields.text({ label: 'Language' }),
        order: fields.number({ label: 'Order' }),
        content: getContentField(),
        status: fields.select({
          defaultValue: 'draft',
          label: 'Status',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Review', value: 'review' },
            { label: 'Pending', value: 'pending' },
          ],
        }),
      },
    }),
    documentation: collection({
      label: 'Documentation',
      slugField: 'title',
      path: `${path}documentation/**`,
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        label: fields.text({
          label: 'Label',
          validation: { isRequired: false },
        }),
        content: getContentField(),
        image: fields.image({
          label: 'Image',
          directory: 'public/site/images',
          publicPath: '/site/images',
        }),
        description: fields.text({ label: 'Description' }),
        publishedAt: fields.date({ label: 'Published At' }),
        order: fields.number({ label: 'Order' }),
        language: fields.text({ label: 'Language' }),
        parent: fields.relationship({
          label: 'Parent',
          collection: 'documentation',
        }),
        categories: fields.array(fields.text({ label: 'Category' })),
        tags: fields.array(fields.text({ label: 'Tag' })),
        status: fields.select({
          defaultValue: 'draft',
          label: 'Status',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Review', value: 'review' },
            { label: 'Pending', value: 'pending' },
          ],
        }),
        collapsible: fields.checkbox({
          label: 'Collapsible',
          defaultValue: false,
        }),
        collapsed: fields.checkbox({
          label: 'Collapsed',
          defaultValue: false,
        }),
      },
    }),
  };
}
