import { expect, test } from 'vitest';
import Template, {
    useInnerHtmlMarker,
    fillTemplateLiteral,
    useHtmlPosition,
} from './Template';

import { htmlStringCheckAttr, htmlStringCheckPos } from './testHtml';

test('getHtmlPosition document', {}, () => {
    const getHtmlPosition = useHtmlPosition();
    for (let i = 0; i !== htmlStringCheckPos.strings.length - 1; i++) {
        const { pos } = getHtmlPosition(htmlStringCheckPos.strings[i]);
        console.log('\n--- TESTRUN ---');
        console.log('string: ', htmlStringCheckPos.strings[i]);
        console.log('pos: ', pos);
        console.log('value: ', htmlStringCheckPos.values[i]);
        expect(pos).toBe(htmlStringCheckPos.values[i]);
    }
});

test('getHtmlTemplateType document', {}, () => {
    const addInnerMarker = useInnerHtmlMarker();
    for (let i = 0; i !== htmlStringCheckAttr.strings.length - 1; i++) {
        // console.log('\n--- TESTRUN ---');
        const pos = addInnerMarker(
            htmlStringCheckAttr.strings[i],
            htmlStringCheckAttr.strings[i + 1],
        );
        // console.log('string: ', htmlStringCheckAttr.strings[i]);
        // console.log('pos: ', pos);
        // console.log('value: ', htmlStringCheckAttr.values[i]);
        expect(pos.lastType).toBe(htmlStringCheckAttr.values[i]);
    }
});

// test('tmp, results of prev and now are same', {}, () => {
//     const templ = new Template(htmlStringCheckAttr.strings);
//     const res1 = templ.result;
//     const res2 = fillTemplateLiteral(htmlStringCheckAttr.strings);

//     console.log(res2);
//     expect(res1).toBe(res2);
// });
