/*
 * This file is part of the µTemplate javascript jquery-less template system.
 *
 * Copyleft of Simone Margaritelli aka evilsocket <evilsocket@gmail.com>
 *
 * µTemplate is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * µTemplate is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with µTemplate.  If not, see <http://www.gnu.org/licenses/>.
 */
function uTemplate( sTemplateId )
{
  this.sId        = sTemplateId;  
  this.sTemplate  = uTemplate.getTemplateContent( sTemplateId );
  this.bLoaded    = typeof(this.sTemplate) == 'string' ? true : false;
  this.fnCompiled = undefined;
  /*
   * regexp
   */
  this.rPlainData = /([\}\$]?)([^\}\{\$]+)([\{\$]?)/mg;
  this.rIf        = /\{\{\s*if\s+([^\}]+)\s*\}\}/g;
  this.rElse      = /\{\{\s*else\s*([^\}]*)\s*\}\}/g;
  this.rEach      = /\{\{\s*each\s*\(\s*([^,]+)\s*,\s*([^\)]+)\s*\)\s*([^\}]+)\s*\}\}/g;
  this.rInclude   = /\{\{\s*include\s+([^\}]+)\s*\}\}/g;
  this.rValue     = /\{\{\s*(=)?\s*([^\/][^\}]+)\s*\}\}/g;
  this.rDollar    = /\$\{([^\}]+)\}/g;  
  this.rEnclosure = /\{\{\s*\/\s*\w+\s*\}\}/g;
}

uTemplate.aTemplatesCache = {};

uTemplate.getTemplateContent = function( sTemplateId )
{
  var oElement;
  
  if( sTemplateId in this.aTemplatesCache )
    return this.aTemplatesCache[sTemplateId];
  
  else if( ( oElement = document.getElementById( sTemplateId ) ) )  
    return this.aTemplatesCache[sTemplateId] = oElement.innerHTML.replace( '/*<![CDATA[*/', '' ).replace( '/*]]>*/', '' );
  
  else
    return undefined;
};

uTemplate.entities = function( sString )
{
  sString = sString ? sString.toString() : '';

  return sString
          .replace( /[&]/gi,    '&amp;' )
          .replace( /[\042]/gi, '&quot;' )
          .replace( /[\047]/gi, '&#039;' )
          .replace( /[<]/gi,    '&lt;' )
          .replace( /[>]/gi,    '&gt;' );
};

uTemplate.quote = function( sString )
{
  sString = sString ? sString.toString() : '';

  return sString.replace( /"/g, "\\\"" );
};

uTemplate.trim = function( text )
{
  return text == null ? "" : text.toString().replace( /^\s+/, '' ).replace( /\s+$/, '' );
};

uTemplate.dump = function( mVariable )
{
  sType = typeof(mVariable);

  if( sType == 'string' )
    return '"' + this.quote( mVariable.replace( /[\n]/gi, '\\n' ) ) + '"';

  else if( sType == 'object' )
  {
    if( mVariable instanceof Array )
      return '[ ' + mVariable.join(' ,') + ' ]';
    else
    {
      var aComposite = new Array();
      
      for( var mKey in mVariable )
      {
        aComposite.push( mKey + ' : ' + this.dump( mVariable[ mKey ] ) );       
      }

      return '{ ' + aComposite.join(' ,') + ' }';
    }   
  }
  else
    return mVariable;
};

uTemplate.prototype.compile = function( oData )
{
  var sOutput = '';
   
  if( this.bLoaded )
  {
    var sCompiled = 'var sReturn = "";\n' +
                    'var aStack  = {};\n';
    /*
     * Define local variables and the stack content.
     */
    for( var sVariableName in oData )
    {
      sCompiled += 'var ' + sVariableName + ' = aStack["' + sVariableName + '"] = ' + uTemplate.dump( oData[sVariableName] ) + ';\n';
    }

    sCompiled +=
      this.sTemplate
      /*
       * Plain data
       */
      .replace( this.rPlainData, function( sSubString, sTagBefore, sValue, sTagAfter, iOffset, sString )
      {
        /*
         * One opening before, one ending after or both.
         */
        if( sTagBefore || sTagAfter )
          return sSubString.replace( sValue, 'sReturn += ' + uTemplate.dump( sValue ) + ';\n' );
        /*
         * Seems like this is not really plain data.
         */
        else
          return sSubString;
      })
      /*
       * {{if condition}}
       *   ...
       * {{/if}}
       */
      .replace( this.rIf, "if( $1 ){" )
      /*
       * {{else}}
       */
      .replace( this.rElse, function( sSubString, sElseCondition, iOffset, sString )
      {
        /*
         * else or else if ?
         */
        return sElseCondition ? '} else if( ' + sElseCondition + ' ){' : '} else {';
      })
      /*
       * {{each( index, item ) array}}
       *   ..
       * {{/each}}
       */
      .replace( this.rEach, 'for( var $1 in $3 ){ var $2 = $3[$1]; aStack["$1"] = $1; aStack["$2"] = $2;' )
      /*
       * {{include templateId}}
       */
      .replace( this.rInclude, 'sReturn += (new uTemplate("$1")).compile(aStack);\n' )
      /*
       * {{=value}}
       */
      .replace( this.rValue, function( sSubString, sEscapeOperator, sValue, iOffset, sString )
      {
        /*
         * To escape or not to escape? This is the problem :)
         */
        return 'sReturn += ' + ( sEscapeOperator === '=' ? 'uTemplate.entities( ' + sValue + ' )' : sValue ) + ';\n';
      })
      /*
       * ${value} ( same as {{=value}} )
       */
      .replace( this.rDollar, function( sSubString, sValue, iOffset, sString )
      {
        return 'sReturn += uTemplate.entities( ' + sValue + ' )' + ';\n'
      })      
      /*
       * {{/keyword}}
       */
      .replace( this.rEnclosure, '}' ) +

      'return sReturn;';
        
    this.fnCompiled = new Function( sCompiled );

    sOutput = this.fnCompiled();
  }

  return sOutput;
};