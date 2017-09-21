var DataStructures = {
    stack : function() {
        var elements;

        this.push = function(element) {
            if (typeof(elements) === 'undefined') {
                elements = [];
            }
            elements.push(element);
        }
        this.pop = function() {
            return elements.pop();
        }
        this.top = function(element) {
            return elements[elements.length - 1];
        }
    }
}

function AstNode(type, params) {
	this.type = type;
	for(var key in params){ this[key] = params[key];}
	return this;
}

// function newPromptBox_continue() {
//     var promptBox_continue = $('<div class="jquery-console-prompt-box"></div>');
//     var label = $('<span class="jquery-console-prompt-label"></span>');
//     var labelText = "       ...";
//     promptBox_continue.append(label.text(labelText).show());
//     label.html(label.html().replace(' ','&nbsp;'));
//     prompt = $('<span class="jquery-console-prompt"></span>');
//     promptBox_continue.append(prompt);
//     $('#console-inner').append(promptBox_continue);
// }
// function focusConsole() {
//   $('#console-inner').addClass('jquery-console-focus');
//   $('#typer').focus();
// }
//
// // Update the prompt display
// function updatePromptDisplay(){
//   var line = "...";
//   var html = '';
//   if (column > 0 && line == ''){
//     // When we have an empty line just display a cursor.
//     html = cursor;
// } else if (column == 3){
//     // We're at the end of the line, so we need to display
//     // the text *and* cursor.
//     html = htmlEncode(line) + cursor;
//   } else {
//     // Grab the current character, if there is one, and
//     // make it the current cursor.
//     var before = line.substring(0, column);
//     var current = line.substring(column,column+1);
//     if (current){
//       current =
//         '<span class="jquery-console-cursor">' +
//         htmlEncode(current) +
//         '</span>';
//     }
//     var after = line.substring(column+1);
//     html = htmlEncode(before) + current + htmlEncode(after);
//   }
//   prompt.html(html);
//   scrollToBottom();
// };

var blockLines = "";
var endFlag = true;

function process(line, report) {
    console.log(line);
    if(line.indexOf(':') == (line.length - 1) ){
        console.log(':continue');
        endFlag = false;
        report('...');
        // newPromptBox_continue();
        // focusConsole();
        blockLines += (line + '\n');
    }
    else if (line == 'end' && !endFlag){
        endFlag = true;
        blockLines += (line + '\n');
        console.log(blockLines);
        try {
         // Grammar is not perfect, have to have it end with a line break
            var judge = piethon.parse(blockLines);
            blockLines = "";
            if(judge == true) {
                var ret = eval_python(finalprogram, report);
                if(ret != null)
                    return ret;
                else report("");
            }
        } catch(e) {
            report([{msg: e.toString(),
            className:"jquery-console-message-error"}]);
        }
    }
    else if (!endFlag){
        console.log(':continue');
        report('...');
        blockLines += (line + '\n');
    }
    else {
        try {
         // Grammar is not perfect, have to have it end with a line break
            var judge = piethon.parse(line + '\n');
            if(judge == true) {
                var ret = eval_python(finalprogram, report);
                if(ret != null)
                    return ret;
                else report("");
            }
        } catch(e) {
            report([{msg: e.toString(),
            className:"jquery-console-message-error"}]);
        }
    }
}

function eval_python(astNode, report) {
	var v;
	switch(astNode.type) {
        case 'function':
			// Function only has a left branch
			v = eval_python(astNode.left, report);
			break;
		case 'Statement':
			// Only need to eval_python the right hand side since thats your return statement
			// The left hand side is either a no op, or the line before that does not matter
			eval_python(astNode.left, report);
			v = eval_python(astNode.right, report);
		          break;
        case 'dict':
			// Handle the right hand side of an array declaration
			// Set the values to real values
			var vec = [];
            var flag = 0;
			var members = astNode.value;
			for(var i=0;i<members.length;i++) {
                for(var j = 0; j < vec.length; j++){
                    if(vec[j].name.value == members[i].name.value){
                        vec[j].value.value = members[i].value.value;
                        flag = 1;
                    }
                }
                if(flag == 0){
                    vec.push(members[i]);
                }
                else {
                    flag = 0;
                }
			}
			v = vec;
			break;
		case 'array':
			// Handle the right hand side of an array declaration
			// Set the values to real values
			var vec = [];

			var members = astNode.value;
			for(var i=0;i<members.length;i++) {
				if(!members[i].name) {
					vec.push(members[i].value);
				} else {
					var identifierValue = executionstack.top()[members[i].name];
					if(!members[i].name in executionstack.top()) {
						throw "NameError: name '"+members[i].name+"' is not defined in list declaration\n";
					}
					vec.push(identifierValue);
				}
			}
			v = vec;
			break;
		case 'arrayindex':
			// Handle rhs of a array index value retrieval
			var identifierValue = executionstack.top()[astNode.name];
			if(!astNode.name in executionstack.top()) {
				throw "NameError: name '"+astNode.name+"' is not defined\n";
			}
            // console.log(typeof identifierValue[0]);
            if(typeof identifierValue[0] == 'object'){
                // console.log("en");
                for(var i = 0; i < identifierValue.length; i++){
                    // console.log(astNode.index);
                    // console.log(identifierValue[i].name.value);
                    if(identifierValue[i].name.value == astNode.index.value){
                        // console.log("yes");
                        v = identifierValue[i].value.value;
                    }
                }
            }
			else{
                // console.log("no");
                v = identifierValue[parseInt(eval_python(astNode.index, report))];
            }
			break;
		case 'len':
			// Handle len()
			var identifierValue = executionstack.top()[astNode.name];
			if(!astNode.name in executionstack.top()) {
				throw "NameError: name '"+astNode.name+"' is not defined in list declaration\n";
			}

			if(!Array.isArray(identifierValue)) {
				throw "TypeError: object of type '"+(typeof identifierValue)+"' has no len()";
			}
			v = identifierValue.length;
			break;
		case 'method':
			// Handle list.append(expr) and list.pop(expr)
			var identifierValue = executionstack.top()[astNode.name];
			if(!astNode.name in executionstack.top()) {
				throw "NameError: name '"+astNode.name+"' is not defined in list declaration\n";
			}
			if(!Array.isArray(identifierValue)) {
				throw "AttributeError: '"+(typeof identifierValue)+"' object has no attribute '"+astNode.method+"'";
			}

			if(astNode.method == "append") {
				identifierValue.push(eval_python(astNode.argument, report));
			} else if(astNode.method == "pop") {
				identifierValue.pop();
			} else {
				throw "AttributeError: '"+astNode.name+"' has no method '"+astNode.method+"'";
			}

			break;
		case 'FunctionCall':
			// Get function node and evaluate it
			funcName = astNode.name;
		 	functionNode = functions[funcName];
			if(!funcName in functions) {
				throw "NameError: function named '"+funcName+"' is not defined";
			}

			// Match given parameters to function signature in number only (no typing for piethon)
			functionparams = functionNode.parameters;
			callparams = astNode.parameters;
			if(functionparams.length != callparams.length) {
				throw "TypeError: "+funcName+"() takes exactly "+functionparams.length+" arguments ("+callparams.length+" given)";
			}

			// New stack with given params included to match signature
			var newstackframe = {};
			for(var i = 0;i<functionparams.length;i++) {
				// If an identifier verify it
				var callpari = callparams[i];
				var funcpari = functionparams[i];
				if(callpari.name) {
					var identifierValue = executionstack.top()[callpari.name];
					if(!callpari.name in executionstack.top()) {
						throw "NameError: name '"+astNode.name+"' is not defined\n";
					}
					newstackframe[funcpari.name] = identifierValue
				} else {
					// Otherwise just set to value
					newstackframe[funcpari.name] = callpari.value;
				}
			}

			// Push new stack frame
			executionstack.push(newstackframe);
			// Call function
			v = eval_python(functionNode, report);

			// Pop, back to old stack frame
			executionstack.pop();
			break;
		case 'if':
			// If
			if(eval_python(astNode.left, report)) {
				v = eval_python(astNode.right, report);
			}
			break;
		case 'ifelse':
			// If-else
			if(eval_python(astNode.left, report)) {
				v = eval_python(astNode.middle, report);
			} else {
				v = eval_python(astNode.right, report);
			}
		    break;
        case 'for':
			// for loop
			iterList = executionstack.top()[astNode.middle.name];
			for (var i = 0; i < iterList.length; i++) {
				executionstack.top()[astNode.left.name] = iterList[i];
				v = eval_python(astNode.right, report);
			}
		    break;
        case 'forimmelist':
			// for a in [1, 2, 3] loop
			eval_python(astNode.middle, report);
			iterList = executionstack.top()["###forList###"];
			for (var i = 0; i < iterList.length; i++) {
				executionstack.top()[astNode.left.name] = iterList[i];
				v = eval_python(astNode.right, report);
			}
            break;
		case 'while':
			// while
			while(eval_python(astNode.left, report)) {
				v = eval_python(astNode.right, report);
			}
			break;
        case 'whilebreak':
            //while-break
            while(eval_python(astNode.left, report)){
                v = eval_python(astNode.middle, report);
                break;
            }
            break;
        case 'whileifbreak':
            //while-break
            while(eval_python(astNode.left, report)){
                v = eval_python(astNode.middle, report);
                if(astNode.right.type == 'ifbreak'){
                    if(eval_python(astNode.right.left, report)){
                        v = eval_python(astNode.right.middle, report);
                        break;
                    }
                    else{
                        v = eval_python(astNode.right.right, report);
                    }
                }
            }
            break;
        case 'whilecontinue':
            //while-continue
            while(eval_python(astNode.left, report)){
                v = eval_python(astNode.middle, report);
            }
            break;
        case 'whileifcontinue':
            //while-continue
            while(eval_python(astNode.left, report)){
                v = eval_python(astNode.middle, report);
                if(astNode.right.type == 'ifcontinue'){
                    if(eval_python(astNode.right.left, report)){
                        v = eval_python(astNode.right.middle, report);
                    }
                    else{
                        v = eval_python(astNode.right.right, report);
                    }
                }
            }
            break;
		case 'IDENT':
			// Look up value in table
			var identifierValue = executionstack.top()[astNode.name];
			if(!astNode.name in executionstack.top()) {
				throw "NameError: name '"+astNode.name+"' is not defined\n";
			}
			v = identifierValue;
			break;
		case '=':
			// Set value of identifier in table
			if(astNode.left.type == 'arrayindex') {
				var vec2 = executionstack.top()[astNode.left.name];
                if(typeof vec2[0] == 'object'){
                    for (var i = 0; i < vec2.length; i++){
                        if(vec2[i].name.value == astNode.left.index.value){
                            vec2[i].value.value = eval_python(astNode.right, report);
                        }
                    }
                }
                else{
                    vec2[parseInt(eval_python(astNode.left.index, report))] = eval_python(astNode.right, report);
                }
			} else {
				executionstack.top()[astNode.left.name] = eval_python(astNode.right, report);
			}
			break;
		case '>':
			if(eval_python(astNode.left, report) >  eval_python(astNode.right, report)) {
				v = true;
			} else {
				v = false;
			}
			break;
		case '>=':
			if(eval_python(astNode.left, report) >=  eval_python(astNode.right, report)) {
				v = true;
			} else {
				v = false;
			}
			break;
		case '<':
			if(eval_python(astNode.left, report) <  eval_python(astNode.right, report)) {
				v = true;
			} else {
				v = false;
			}
			break;
		case '<=':
			if(eval_python(astNode.left, report) <=  eval_python(astNode.right, report)) {
				v = true;
			} else {
				v = false;
			}
			break;

		case '==':
			if(eval_python(astNode.left, report) == eval_python(astNode.right, report)) {
				v = true;
			} else {
				v = false;
			}
			break;
		case '!=':
			if(eval_python(astNode.left, report) != eval_python(astNode.right, report)) {
				v = true;
			} else {
				v = false;
			}
			break;
		case 'no-op':
			// Do nothing!
		break;
		case 'print':
			v = eval_python(astNode.left, report);
			var strPrint;
			if(Array.isArray(v)) {
                if(typeof v[0] == 'object'){
                    strPrint = '{'
                    for(var i = 0; i < v.length-1; i++){
                        strPrint += v[i].name.value + ' : ' + v[i].value.value + ', ';
                    }
                    strPrint += v[i].name.value + ' : ' + v[i].value.value + '}';
                }
                else{
                    strPrint = '['+v.toString()+']';
                }
			} else {
				strPrint = v;
			}
            // Print
            if(typeof(report) == 'function'){
                report(strPrint+'\n');
                // report([{msg:strPrint+'\n',
    			// 	className:"jquery-console-message-error"}]);
            }
            else {
                jqconsole.Write(strPrint+'\n', 'jqconsole-result');
            }
			break;
		case 'return': v = eval_python(astNode.left, report); break;
		case 'NUMBER': v = astNode.value; break;
		case 'STRING': v = astNode.value.replace(/\"/g,''); break;
		case '+':
			left = eval_python(astNode.left, report);
			right = eval_python(astNode.right, report);
			v = (left + right);
			break;
		case '-':
			left = eval_python(astNode.left, report);
			right = eval_python(astNode.right, report);
			v = left - right;
			break;
		case '*':
			left = eval_python(astNode.left, report);
			right = eval_python(astNode.right, report);
			v = (left * right);
		break;
		case '/':
			left = eval_python(astNode.left, report);
			right = eval_python(astNode.right, report);
			v = (left / right);
			break;
		case '%':
			left = eval_python(astNode.left, report);
			right = eval_python(astNode.right, report);
			v = (left % right);
			break;
		case '**':
			left = eval_python(astNode.left, report);
			right = eval_python(astNode.right, report);
			v = Math.pow(left, right);
			break;

		case 'UMINUS': v = -1 * eval_python(astNode.left, report); break;
		default: throw "internal error: bad node '"+astNode.type+"'";
	}
	return v;
}

function resetForRun() {
	functions = {
		// Pre-create the main function
		'#main#' : new AstNode('function', {name : '#main#'})
	};
}

// The whole program tree
var finalprogram;
// Function map
var functions = {
	// Pre-create the main function
	'#main#' : new AstNode('function', {name : '#main#'})
};
// Execution stack
var executionstack = new DataStructures.stack();
executionstack.push({});
