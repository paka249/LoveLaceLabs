export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function serializeNodeArray(nodes) {
  if (!nodes || !Array.isArray(nodes)) return '';
  return nodes
    .map((node) => {
      if (node.type === 'text') {
        return node.value;
      }
      if (node.type === 'sigma' || node.type === 'product') {
        const symbol = node.type === 'sigma' ? 'Σ' : 'Π';
        const index = serializeNodeArray(node.index);
        const lower = serializeNodeArray(node.lower);
        const upper = serializeNodeArray(node.upper);
        const expr = serializeNodeArray(node.expr);
        return `${symbol}(${index}=${lower}→${upper})(${expr})`;
      }
      if (node.type === 'fraction') {
        const num = serializeNodeArray(node.numerator);
        const den = serializeNodeArray(node.denominator);
        return `(${num})/(${den})`;
      }
      return '';
    })
    .join('');
}

export function createInitialNode(type) {
  const id = generateId();
  if (type === 'fraction') {
    return {
      type: 'fraction',
      id,
      numerator: [{ type: 'text', value: '', id: generateId() }],
      denominator: [{ type: 'text', value: '', id: generateId() }],
    };
  }
  if (type === 'sigma' || type === 'product') {
    return {
      type,
      id,
      upper: [{ type: 'text', value: '', id: generateId() }],
      lower: [{ type: 'text', value: '1', id: generateId() }],
      index: [{ type: 'text', value: 'i', id: generateId() }],
      expr: [{ type: 'text', value: '', id: generateId() }],
    };
  }
  throw new Error(`Unknown node type: ${type}`);
}

export function insertTemplateAtTextNode(nodes, targetId, caretPos, templateType) {
  if (!nodes || !Array.isArray(nodes)) return null;

  const index = nodes.findIndex((n) => n.id === targetId);
  if (index !== -1) {
    const targetNode = nodes[index];
    const leftVal = targetNode.value.slice(0, caretPos);
    const rightVal = targetNode.value.slice(caretPos);
    const newTemplate = createInitialNode(templateType);

    const leftNode = { ...targetNode, value: leftVal };
    const rightNode = { type: 'text', value: rightVal, id: generateId() };

    const newNodes = [...nodes];
    newNodes.splice(index, 1, leftNode, newTemplate, rightNode);

    const focusNodeId = templateType === 'fraction'
      ? newTemplate.numerator[0].id
      : newTemplate.upper[0].id;

    return {
      updatedNodes: newNodes,
      focusNodeId,
    };
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.type === 'fraction') {
      const numRes = insertTemplateAtTextNode(node.numerator, targetId, caretPos, templateType);
      if (numRes) {
        const newNodes = [...nodes];
        newNodes[i] = { ...node, numerator: numRes.updatedNodes };
        return { updatedNodes: newNodes, focusNodeId: numRes.focusNodeId };
      }
      const denRes = insertTemplateAtTextNode(node.denominator, targetId, caretPos, templateType);
      if (denRes) {
        const newNodes = [...nodes];
        newNodes[i] = { ...node, denominator: denRes.updatedNodes };
        return { updatedNodes: newNodes, focusNodeId: denRes.focusNodeId };
      }
    } else if (node.type === 'sigma' || node.type === 'product') {
      const fields = ['upper', 'lower', 'index', 'expr'];
      for (const field of fields) {
        const res = insertTemplateAtTextNode(node[field], targetId, caretPos, templateType);
        if (res) {
          const newNodes = [...nodes];
          newNodes[i] = { ...node, [field]: res.updatedNodes };
          return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
        }
      }
    }
  }

  return null;
}

export function findParentArrayAndIndex(nodes, targetId) {
  if (!nodes || !Array.isArray(nodes)) return null;

  const idx = nodes.findIndex((n) => n.id === targetId);
  if (idx !== -1) {
    return { parentArray: nodes, index: idx };
  }

  for (const node of nodes) {
    if (node.type === 'fraction') {
      const numRes = findParentArrayAndIndex(node.numerator, targetId);
      if (numRes) return numRes;
      const denRes = findParentArrayAndIndex(node.denominator, targetId);
      if (denRes) return denRes;
    } else if (node.type === 'sigma' || node.type === 'product') {
      const fields = ['upper', 'lower', 'index', 'expr'];
      for (const field of fields) {
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    }
  }

  return null;
}

export function findParentTemplateOfArray(nodes, targetId) {
  if (!nodes || !Array.isArray(nodes)) return null;

  for (const node of nodes) {
    if (node.type === 'fraction') {
      if (node.numerator.some((n) => n.id === targetId)) {
        return { parentTemplate: node, fieldName: 'numerator' };
      }
      if (node.denominator.some((n) => n.id === targetId)) {
        return { parentTemplate: node, fieldName: 'denominator' };
      }

      const numRes = findParentTemplateOfArray(node.numerator, targetId);
      if (numRes) return numRes;
      const denRes = findParentTemplateOfArray(node.denominator, targetId);
      if (denRes) return denRes;
    } else if (node.type === 'sigma' || node.type === 'product') {
      const fields = ['upper', 'lower', 'index', 'expr'];
      for (const field of fields) {
        if (node[field].some((n) => n.id === targetId)) {
          return { parentTemplate: node, fieldName: field };
        }
      }
      for (const field of fields) {
        const res = findParentTemplateOfArray(node[field], targetId);
        if (res) return res;
      }
    }
  }

  return null;
}

export function deleteTemplateAtTextNodeStart(tree, targetId) {
  const res = findParentArrayAndIndex(tree, targetId);
  if (!res) return null;
  const { parentArray, index } = res;

  if (index > 0) {
    const leftTextNode = parentArray[index - 2];

    const newTree = JSON.parse(JSON.stringify(tree));
    const cloneRes = findParentArrayAndIndex(newTree, targetId);
    const cloneParent = cloneRes.parentArray;
    const cloneIdx = cloneRes.index;

    if (leftTextNode) {
      const leftNodeInClone = cloneParent[cloneIdx - 2];
      const rightNodeInClone = cloneParent[cloneIdx];
      const focusNodeId = leftNodeInClone.id;
      const focusCaret = leftNodeInClone.value.length;

      leftNodeInClone.value += rightNodeInClone.value;
      cloneParent.splice(cloneIdx - 1, 2);

      return {
        updatedNodes: newTree,
        focusNodeId,
        focusCaret,
      };
    } else {
      const focusNodeId = cloneParent[cloneIdx].id;
      const focusCaret = 0;
      cloneParent.splice(0, 1);

      return {
        updatedNodes: newTree,
        focusNodeId,
        focusCaret,
      };
    }
  }

  const parentTemplateRes = findParentTemplateOfArray(tree, targetId);
  if (!parentTemplateRes) return null;

  const { parentTemplate, fieldName } = parentTemplateRes;

  const isFirstField =
    (parentTemplate.type === 'fraction' && fieldName === 'numerator') ||
    ((parentTemplate.type === 'sigma' || parentTemplate.type === 'product') && fieldName === 'upper');

  if (!isFirstField) {
    return null;
  }

  const grandparentRes = findParentArrayAndIndex(tree, parentTemplate.id);
  if (!grandparentRes) return null;

  const newTree = JSON.parse(JSON.stringify(tree));
  const cloneGrandparentRes = findParentArrayAndIndex(newTree, parentTemplate.id);
  const cloneGrandparentArray = cloneGrandparentRes.parentArray;
  const cloneParentTemplateIdx = cloneGrandparentRes.index;

  const leftTextNodeInClone = cloneGrandparentArray[cloneParentTemplateIdx - 1];
  const rightTextNodeInClone = cloneGrandparentArray[cloneParentTemplateIdx + 1];

  if (leftTextNodeInClone && rightTextNodeInClone) {
    const focusNodeId = leftTextNodeInClone.id;
    const focusCaret = leftTextNodeInClone.value.length;
    leftTextNodeInClone.value += rightTextNodeInClone.value;
    cloneGrandparentArray.splice(cloneParentTemplateIdx, 2);

    return {
      updatedNodes: newTree,
      focusNodeId,
      focusCaret,
    };
  } else if (leftTextNodeInClone) {
    const focusNodeId = leftTextNodeInClone.id;
    const focusCaret = leftTextNodeInClone.value.length;
    cloneGrandparentArray.splice(cloneParentTemplateIdx, 1);

    return {
      updatedNodes: newTree,
      focusNodeId,
      focusCaret,
    };
  } else if (rightTextNodeInClone) {
    const focusNodeId = rightTextNodeInClone.id;
    const focusCaret = 0;
    cloneGrandparentArray.splice(cloneParentTemplateIdx, 1);

    return {
      updatedNodes: newTree,
      focusNodeId,
      focusCaret,
    };
  } else {
    const newTextNode = { type: 'text', value: '', id: generateId() };
    const focusNodeId = newTextNode.id;
    const focusCaret = 0;
    cloneGrandparentArray[cloneParentTemplateIdx] = newTextNode;

    return {
      updatedNodes: newTree,
      focusNodeId,
      focusCaret,
    };
  }
}

export function getFlatTextNodes(nodes) {
  const result = [];
  function traverse(list) {
    if (!list || !Array.isArray(list)) return;
    for (const node of list) {
      if (node.type === 'text') {
        result.push(node);
      } else if (node.type === 'fraction') {
        traverse(node.numerator);
        traverse(node.denominator);
      } else if (node.type === 'sigma' || node.type === 'product') {
        traverse(node.upper);
        traverse(node.lower);
        traverse(node.index);
        traverse(node.expr);
      }
    }
  }
  traverse(nodes);
  return result;
}
