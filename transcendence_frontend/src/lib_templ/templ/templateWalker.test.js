import { expect, test } from 'vitest';
import { htmlStringCheckAttr } from './testHtml';
import useTemplateTreeWalker from './templateWalker';
import { fillTemplateLiteral } from './Template';

test('check Number of Nodes', {}, () => {
    const parseTemplate = useTemplateTreeWalker();
    const result = fillTemplateLiteral(htmlStringCheckAttr.strings);
    const template = document.createElement('template');
    template.innerHTML = result;
    const getLives = parseTemplate(
        template.content,
        htmlStringCheckAttr.values.length,
    );
});
