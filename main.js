// Author: Nathan Turner
// I used brackets-automatch-pairs-master extension as starting code.
// I'm not sure how much is considered substantial so I'll leave the below notice untouched. I adopt the same license.

/*
* Copyright (c) 2013 Zaidin Amiot. All rights reserved.
*
* Permission is hereby granted, free of charge, to any person obtaining a
* copy of this software and associated documentation files (the "Software"),
* to deal in the Software without restriction, including without limitation
* the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
* DEALINGS IN THE SOFTWARE.
*
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
    'use strict';
    
    // Brackets modules.
    var CommandManager      = brackets.getModule("command/CommandManager"),
        ExtensionUtils = brackets.getModule("utils/ExtensionUtils"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        Menus               = brackets.getModule("command/Menus"),
        Commands            = brackets.getModule("command/Commands"),
        Strings             = brackets.getModule("strings"),
        FindReplace         = brackets.getModule("search/FindReplace"),
        FindBar,
        
    // Extension variables.
        SELECTMULTIPLE        = 'selectMultiple.next',
        SKIPSELECTION       = 'selectMultiple.skip',
        _enabled            = true,
        _previouslySearched = false,
        _previousQuery      = "",
        prevText = "",
        matches = [],
        selected = [];

    ExtensionUtils.loadStyleSheet(module, "style.css");
    
    function escapeRegexpChars(selectedText) {
        //http://stackoverflow.com/questions/3115150/how-to-escape-regular-expression-special-characters-using-javascript
        return selectedText.replace(/[\-\[\]{}()*+?.,\\$\^|#\s]/g, "\\$&");
    }

    // CodeMirror.clear();

    function onChange(editor){

        if(editor.isEventBinded != undefined)
            return;

        editor.isEventBinded = true;

        $(editor).on("cursorActivity", function(event, editor){

            var selections = editor.getSelections();
            
            if(!editor.hasSelection()){
                selected = [];
                matches = [];
                prevText = "";
                clearAllMarks(editor);
            }

        });
    }

    function clearAllMarks(editor){

        var markedTexts = editor._codeMirror.doc.getAllMarks();
        for(i in markedTexts){
            
            var mark = markedTexts[i];
            if(typeof mark == "object")
                mark.clear();
        }


    }

    function selectNext(){


        var editor = EditorManager.getActiveEditor();
        var selection = editor.getSelection();
        var line = editor.document.getLine(selection.start.line);
        var originalText = line.substring(selection.start.ch, selection.end.ch);
        var selectedText = escapeRegexpChars(originalText);
        
        var contents = editor._codeMirror.doc.getValue();

        if(selectedText.length == 0)
            return;

        console.log(selectedText + " == " + prevText);
        //Do this only when new selection is made///////
        if(prevText != selectedText && editor.hasSelection()
            )
        {
            onChange(editor);
            console.log("Matching...");
            matches = getMatches(contents, selectedText);

            //Convert matches to selections//////////////
            matches = matches.map(function(index){
                
                var start = indexToLineChar(index, contents);
                return{

                    start: start,
                    end: {
                        line: start.line,
                        ch: start.ch + originalText.length
                    },
                    reserved: false
                };
            });

            //Put leading matches to end//////////////////
            var i = 0;
            for(i in matches)
            {
                var start = matches[i].start;
                if(start.line == selection.start.line && start.ch == selection.start.ch)
                    break;
            }

            var front = matches.splice(i);
            matches = front.concat(matches);

            //Reset selection////////////////////////////
            // selected = [matches[0]];
            selected = [];
        }

        //Add next selection///////////////////////////// 
        if(selected.length < matches.length)
            selected.push(matches[selected.length]);



        prevText = selectedText;
        editor.setSelections(selected);

        clearAllMarks(editor);

        markUnselectedMatches(editor);
    }

    function skipNextMatch(){

        var editor = EditorManager.getActiveEditor();

        console.log("skipping");
        console.log(JSON.stringify(matches, true));

        matches.splice(selected.length, 1);
        console.log(JSON.stringify(matches, true));

        clearAllMarks(editor);
        markUnselectedMatches(editor);
    }


    function markUnselectedMatches(editor){

        var unselected = matches.slice(selected.length);

        for(i in unselected){
            var current = unselected[i];
            editor._codeMirror.doc.markText(current.start,current.end, {
                className: "mcs-unselected"
            });    
        }
        

    }

    function indexToLineChar(index, str){

        str = str.substring(0,index);
        var line = str.split("\n").length - 1;
        var charPos = index - str.lastIndexOf("\n") - 1;

        return {
            line: line,
            ch: charPos
        };
    }

    function getMatches(haystack, needle) {
        var regex = new RegExp(needle.toLowerCase(), 'g'),
            result = [],
            match;

        haystack = haystack.toLowerCase();

        while ((match = regex.exec(haystack)) != null) {
            result.push(match.index);
        }
        return result;
    }

    // Register command.
    CommandManager.register("Select next match", SELECTMULTIPLE, selectNext);
    CommandManager.register("Skip next match", SKIPSELECTION, skipNextMatch);

    // Add command to View menu.
    Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(SELECTMULTIPLE, [{ "key": "Alt-D" }, { "key": "Alt-D", "platform": "mac" }]);
    Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(SKIPSELECTION, [{ "key": "Alt-S" }, { "key": "Alt-S", "platform": "mac" }]);
    // Set the starting state for the menu item.
    CommandManager.get(SELECTMULTIPLE).setChecked(_enabled);
    CommandManager.get(SKIPSELECTION).setChecked(_enabled);
});