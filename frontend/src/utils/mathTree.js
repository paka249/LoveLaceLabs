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
      if (node.type === 'power') {
        const base = serializeNodeArray(node.base);
        const exponent = serializeNodeArray(node.exponent) || '2';
        return `(${base})^(${exponent})`;
      }
      if (node.type === 'floor') {
        const arg = serializeNodeArray(node.arg);
        return `floor(${arg})`;
      }
      if (node.type === 'ceiling') {
        const arg = serializeNodeArray(node.arg);
        return `ceil(${arg})`;
      }
      if (node.type === 'mode') {
        const left = serializeNodeArray(node.left);
        const right = serializeNodeArray(node.right);
        return `mode(${left},${right})`;
      }
      if (node.type === 'nthRoot') {
        const value = serializeNodeArray(node.value);
        const degree = serializeNodeArray(node.degree) || 'n';
        return `nthroot(${value},${degree})`;
      }
      if (node.type === 'logBase') {
        const value = serializeNodeArray(node.value);
        const base = serializeNodeArray(node.base) || 'b';
        return `log_b(${value},${base})`;
      }
      if (node.type === 'integral') {
        const expr = serializeNodeArray(node.expr);
        const variable = serializeNodeArray(node.variable) || 'x';
        const lower = serializeNodeArray(node.lower).trim();
        const upper = serializeNodeArray(node.upper).trim();
        if (lower || upper) {
          return `∫(${lower || '0'}→${upper || '1'})(${expr})d(${variable})`;
        }
        return `∫(${expr})d(${variable})`;
      }
      if (node.type === 'derivative') {
        const expr = serializeNodeArray(node.expr);
        const variable = serializeNodeArray(node.variable) || 'x';
        return `d/d${variable}(${expr})`;
      }
      if (node.type === 'derivativeN') {
        const expr = serializeNodeArray(node.expr);
        const variable = serializeNodeArray(node.variable) || 'x';
        const order = serializeNodeArray(node.order) || '2';
        return `d^${order}/d${variable}^${order}(${expr})`;
      }
      if (node.type === 'partial') {
        const expr = serializeNodeArray(node.expr);
        const variable = serializeNodeArray(node.variable) || 'x';
        return `∂/∂${variable}(${expr})`;
      }
      if (node.type === 'partialN') {
        const expr = serializeNodeArray(node.expr);
        const variable = serializeNodeArray(node.variable) || 'x';
        const order = serializeNodeArray(node.order) || '2';
        return `∂^${order}/∂${variable}^${order}(${expr})`;
      }
      if (node.type === 'trigFunction') {
        const arg = serializeNodeArray(node.arg);
        return `${node.callName ?? node.func}(${arg})`;
      }
      return '';
    })
    .join('');
}

function normalizeTemplateSpec(spec) {
  if (typeof spec === 'string') {
    return { type: spec };
  }
  return spec;
}

function getInitialFocusNodeId(node) {
  if (node.type === 'fraction') {
    return node.numerator[0].id;
  }
  if (node.type === 'power') {
    return node.base[0].id;
  }
  if (node.type === 'floor' || node.type === 'ceiling') {
    return node.arg[0].id;
  }
  if (node.type === 'mode') {
    return node.left[0].id;
  }
  if (node.type === 'nthRoot' || node.type === 'logBase') {
    return node.value[0].id;
  }
  if (node.type === 'sigma' || node.type === 'product') {
    return node.upper[0].id;
  }
  if (node.type === 'integral' || node.type === 'derivative') {
    return node.expr[0].id;
  }
  if (node.type === 'derivativeN' || node.type === 'partial' || node.type === 'partialN') {
    return node.expr[0].id;
  }
  if (node.type === 'trigFunction') {
    return node.arg[0].id;
  }
  return null;
}

export function createInitialNode(spec) {
  const { type, func = 'sin', callName = null, exponent = 'n', degree = 'n' } = normalizeTemplateSpec(spec);
  const id = generateId();
  if (type === 'fraction') {
    return {
      type: 'fraction',
      id,
      numerator: [{ type: 'text', value: '', id: generateId() }],
      denominator: [{ type: 'text', value: '', id: generateId() }],
    };
  }
  if (type === 'power') {
    return {
      type,
      id,
      base: [{ type: 'text', value: '', id: generateId() }],
      exponent: [{ type: 'text', value: String(exponent), id: generateId() }],
    };
  }
  if (type === 'floor' || type === 'ceiling') {
    return {
      type,
      id,
      arg: [{ type: 'text', value: '', id: generateId() }],
    };
  }
  if (type === 'mode') {
    return {
      type,
      id,
      left: [{ type: 'text', value: '', id: generateId() }],
      right: [{ type: 'text', value: '', id: generateId() }],
    };
  }
  if (type === 'nthRoot') {
    return {
      type,
      id,
      degree: [{ type: 'text', value: String(degree), id: generateId() }],
      value: [{ type: 'text', value: '', id: generateId() }],
    };
  }
  if (type === 'logBase') {
    return {
      type,
      id,
      base: [{ type: 'text', value: 'b', id: generateId() }],
      value: [{ type: 'text', value: '', id: generateId() }],
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
  if (type === 'integral') {
    return {
      type,
      id,
      upper: [{ type: 'text', value: '', id: generateId() }],
      lower: [{ type: 'text', value: '', id: generateId() }],
      expr: [{ type: 'text', value: '', id: generateId() }],
      variable: [{ type: 'text', value: 'x', id: generateId() }],
    };
  }
  if (type === 'derivative') {
    return {
      type,
      id,
      expr: [{ type: 'text', value: '', id: generateId() }],
      variable: [{ type: 'text', value: 'x', id: generateId() }],
    };
  }
  if (type === 'derivativeN') {
    return {
      type,
      id,
      order: [{ type: 'text', value: '2', id: generateId() }],
      expr: [{ type: 'text', value: '', id: generateId() }],
      variable: [{ type: 'text', value: 'x', id: generateId() }],
    };
  }
  if (type === 'partial') {
    return {
      type,
      id,
      expr: [{ type: 'text', value: '', id: generateId() }],
      variable: [{ type: 'text', value: 'x', id: generateId() }],
    };
  }
  if (type === 'partialN') {
    return {
      type,
      id,
      order: [{ type: 'text', value: '2', id: generateId() }],
      expr: [{ type: 'text', value: '', id: generateId() }],
      variable: [{ type: 'text', value: 'x', id: generateId() }],
    };
  }
  if (type === 'trigFunction') {
    return {
      type,
      id,
      func,
      callName: callName ?? func,
      arg: [{ type: 'text', value: '', id: generateId() }],
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

    const replacements = [];
    if (leftVal.length > 0) {
      replacements.push({ ...targetNode, value: leftVal });
    }
    replacements.push(newTemplate);
    if (rightVal.length > 0) {
      replacements.push({ type: 'text', value: rightVal, id: generateId() });
    }

    const newNodes = [...nodes];
    newNodes.splice(index, 1, ...replacements);

    const focusNodeId = getInitialFocusNodeId(newTemplate);

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
    } else if (node.type === 'power') {
      const fields = ['base', 'exponent'];
      for (const field of fields) {
        const res = insertTemplateAtTextNode(node[field], targetId, caretPos, templateType);
        if (res) {
          const newNodes = [...nodes];
          newNodes[i] = { ...node, [field]: res.updatedNodes };
          return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
        }
      }
    } else if (node.type === 'floor' || node.type === 'ceiling') {
      const res = insertTemplateAtTextNode(node.arg, targetId, caretPos, templateType);
      if (res) {
        const newNodes = [...nodes];
        newNodes[i] = { ...node, arg: res.updatedNodes };
        return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
      }
    } else if (node.type === 'mode') {
      const fields = ['left', 'right'];
      for (const field of fields) {
        const res = insertTemplateAtTextNode(node[field], targetId, caretPos, templateType);
        if (res) {
          const newNodes = [...nodes];
          newNodes[i] = { ...node, [field]: res.updatedNodes };
          return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
        }
      }
    } else if (node.type === 'nthRoot' || node.type === 'logBase') {
      const fields = ['value', 'degree', 'base'];
      for (const field of fields) {
        if (!node[field]) continue;
        const res = insertTemplateAtTextNode(node[field], targetId, caretPos, templateType);
        if (res) {
          const newNodes = [...nodes];
          newNodes[i] = { ...node, [field]: res.updatedNodes };
          return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
        }
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
    } else if (node.type === 'integral') {
      const fields = ['upper', 'lower', 'expr', 'variable'];
      for (const field of fields) {
        const res = insertTemplateAtTextNode(node[field], targetId, caretPos, templateType);
        if (res) {
          const newNodes = [...nodes];
          newNodes[i] = { ...node, [field]: res.updatedNodes };
          return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
        }
      }
    } else if (node.type === 'derivative') {
      const fields = ['expr', 'variable'];
      for (const field of fields) {
        const res = insertTemplateAtTextNode(node[field], targetId, caretPos, templateType);
        if (res) {
          const newNodes = [...nodes];
          newNodes[i] = { ...node, [field]: res.updatedNodes };
          return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
        }
      }
    } else if (node.type === 'derivativeN' || node.type === 'partialN') {
      const fields = ['order', 'expr', 'variable'];
      for (const field of fields) {
        const res = insertTemplateAtTextNode(node[field], targetId, caretPos, templateType);
        if (res) {
          const newNodes = [...nodes];
          newNodes[i] = { ...node, [field]: res.updatedNodes };
          return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
        }
      }
    } else if (node.type === 'partial') {
      const fields = ['expr', 'variable'];
      for (const field of fields) {
        const res = insertTemplateAtTextNode(node[field], targetId, caretPos, templateType);
        if (res) {
          const newNodes = [...nodes];
          newNodes[i] = { ...node, [field]: res.updatedNodes };
          return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
        }
      }
    } else if (node.type === 'trigFunction') {
      const res = insertTemplateAtTextNode(node.arg, targetId, caretPos, templateType);
      if (res) {
        const newNodes = [...nodes];
        newNodes[i] = { ...node, arg: res.updatedNodes };
        return { updatedNodes: newNodes, focusNodeId: res.focusNodeId };
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
    } else if (node.type === 'power') {
      const fields = ['base', 'exponent'];
      for (const field of fields) {
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'floor' || node.type === 'ceiling') {
      const res = findParentArrayAndIndex(node.arg, targetId);
      if (res) return res;
    } else if (node.type === 'mode') {
      const fields = ['left', 'right'];
      for (const field of fields) {
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'nthRoot' || node.type === 'logBase') {
      const fields = ['value', 'degree', 'base'];
      for (const field of fields) {
        if (!node[field]) continue;
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'sigma' || node.type === 'product') {
      const fields = ['upper', 'lower', 'index', 'expr'];
      for (const field of fields) {
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'integral') {
      const fields = ['upper', 'lower', 'expr', 'variable'];
      for (const field of fields) {
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'derivative') {
      const fields = ['expr', 'variable'];
      for (const field of fields) {
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'derivativeN' || node.type === 'partialN') {
      const fields = ['order', 'expr', 'variable'];
      for (const field of fields) {
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'partial') {
      const fields = ['expr', 'variable'];
      for (const field of fields) {
        const res = findParentArrayAndIndex(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'trigFunction') {
      const res = findParentArrayAndIndex(node.arg, targetId);
      if (res) return res;
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
    } else if (node.type === 'power') {
      const fields = ['base', 'exponent'];
      for (const field of fields) {
        if (node[field].some((n) => n.id === targetId)) {
          return { parentTemplate: node, fieldName: field };
        }
      }
      for (const field of fields) {
        const res = findParentTemplateOfArray(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'floor' || node.type === 'ceiling') {
      if (node.arg.some((n) => n.id === targetId)) {
        return { parentTemplate: node, fieldName: 'arg' };
      }
      const argRes = findParentTemplateOfArray(node.arg, targetId);
      if (argRes) return argRes;
    } else if (node.type === 'mode') {
      const fields = ['left', 'right'];
      for (const field of fields) {
        if (node[field].some((n) => n.id === targetId)) {
          return { parentTemplate: node, fieldName: field };
        }
      }
      for (const field of fields) {
        const res = findParentTemplateOfArray(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'nthRoot' || node.type === 'logBase') {
      const fields = ['value', 'degree', 'base'];
      for (const field of fields) {
        if (!node[field]) continue;
        if (node[field].some((n) => n.id === targetId)) {
          return { parentTemplate: node, fieldName: field };
        }
      }
      for (const field of fields) {
        if (!node[field]) continue;
        const res = findParentTemplateOfArray(node[field], targetId);
        if (res) return res;
      }
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
    } else if (node.type === 'integral') {
      const fields = ['upper', 'lower', 'expr', 'variable'];
      for (const field of fields) {
        if (node[field].some((n) => n.id === targetId)) {
          return { parentTemplate: node, fieldName: field };
        }
      }
      for (const field of fields) {
        const res = findParentTemplateOfArray(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'derivative') {
      const fields = ['expr', 'variable'];
      for (const field of fields) {
        if (node[field].some((n) => n.id === targetId)) {
          return { parentTemplate: node, fieldName: field };
        }
      }
      for (const field of fields) {
        const res = findParentTemplateOfArray(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'derivativeN' || node.type === 'partialN') {
      const fields = ['order', 'expr', 'variable'];
      for (const field of fields) {
        if (node[field].some((n) => n.id === targetId)) {
          return { parentTemplate: node, fieldName: field };
        }
      }
      for (const field of fields) {
        const res = findParentTemplateOfArray(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'partial') {
      const fields = ['expr', 'variable'];
      for (const field of fields) {
        if (node[field].some((n) => n.id === targetId)) {
          return { parentTemplate: node, fieldName: field };
        }
      }
      for (const field of fields) {
        const res = findParentTemplateOfArray(node[field], targetId);
        if (res) return res;
      }
    } else if (node.type === 'trigFunction') {
      if (node.arg.some((n) => n.id === targetId)) {
        return { parentTemplate: node, fieldName: 'arg' };
      }
      const argRes = findParentTemplateOfArray(node.arg, targetId);
      if (argRes) return argRes;
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
    (parentTemplate.type === 'power' && fieldName === 'base') ||
    ((parentTemplate.type === 'floor' || parentTemplate.type === 'ceiling') && fieldName === 'arg') ||
    (parentTemplate.type === 'mode' && fieldName === 'left') ||
    ((parentTemplate.type === 'nthRoot' || parentTemplate.type === 'logBase') && fieldName === 'value') ||
    ((parentTemplate.type === 'sigma' || parentTemplate.type === 'product') && fieldName === 'upper') ||
    ((parentTemplate.type === 'integral' || parentTemplate.type === 'derivative') && fieldName === 'expr') ||
    ((parentTemplate.type === 'derivativeN' || parentTemplate.type === 'partial' || parentTemplate.type === 'partialN') && fieldName === 'expr') ||
    (parentTemplate.type === 'trigFunction' && fieldName === 'arg');

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
      } else if (node.type === 'power') {
        traverse(node.base);
        traverse(node.exponent);
      } else if (node.type === 'floor' || node.type === 'ceiling') {
        traverse(node.arg);
      } else if (node.type === 'mode') {
        traverse(node.left);
        traverse(node.right);
      } else if (node.type === 'nthRoot') {
        traverse(node.value);
        traverse(node.degree);
      } else if (node.type === 'logBase') {
        traverse(node.value);
        traverse(node.base);
      } else if (node.type === 'sigma' || node.type === 'product') {
        traverse(node.upper);
        traverse(node.lower);
        traverse(node.index);
        traverse(node.expr);
      } else if (node.type === 'integral' || node.type === 'derivative') {
        if (node.type === 'integral') {
          traverse(node.upper);
          traverse(node.lower);
        }
        traverse(node.expr);
        traverse(node.variable);
      } else if (node.type === 'derivativeN' || node.type === 'partialN') {
        traverse(node.order);
        traverse(node.expr);
        traverse(node.variable);
      } else if (node.type === 'partial') {
        traverse(node.expr);
        traverse(node.variable);
      } else if (node.type === 'trigFunction') {
        traverse(node.arg);
      }
    }
  }
  traverse(nodes);
  return result;
}
