//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {
    //token에 public을 지정해주니 compile error 해결
    IERC20 public token;

    constructor (address _token) ERC20("Gray Uniswap V2", "GUNI-V2") {
        token = IERC20(_token);
        //값을 상수로 고정하는 이유는 악의적인 사용자가 만든 유사한 LP 토큰 이더의 판매 등을 막기 위해
        //무슨 토큰의 페어인지 이름만으로는 알 수 없도록 고정시켜놓은 것
    }
    
    //유동성 공급
    function addLiquidity(uint256 _maxTokens) public payable {
        uint256 totalLiquidity = totalSupply();
        if (totalLiquidity > 0){
            uint256 ethReserve = address(this).balance - msg.value;
            uint256 tokenReserve = token.balanceOf(address(this));
            uint256 tokenAmount = msg.value * tokenReserve / ethReserve;
            require(_maxTokens >= tokenAmount);
            token.transferFrom(msg.sender, address(this), tokenAmount);
            uint256 liquidityMinted = totalLiquidity * msg.value / ethReserve;
            _mint(msg.sender, liquidityMinted);
        }else{
            //유동성이 없는 상황에서 유동성 공급
            uint256 tokenAmount = _maxTokens;
            uint256 initialLiquidity = address(this).balance;
            _mint(msg.sender, initialLiquidity); //유동성 공급을 한 msg.sender에게 그만큼의 LP 토큰 발급
            token.transferFrom(msg.sender, address(this), tokenAmount);
        }
    }

    //유동성 제거
    function removeLiquidity(uint256 _lpTokenAmount) public {
        uint256 totalLiquidity = totalSupply();
        uint256 ethAmount = _lpTokenAmount * address(this).balance / totalLiquidity;
        //내가 받게될 토큰의 양
        uint256 tokenAmount = _lpTokenAmount * token.balanceOf(address(this)) / totalLiquidity;

        _burn(msg.sender, _lpTokenAmount);

        //위에서 계산한만큼의 eth와 토큰을 나에게 보내라
        payable(msg.sender).transfer(ethAmount);
        token.transfer(msg.sender, tokenAmount);
    }
  
    // ETH -> ERC20
    function ethToTokenSwap(uint256 _minTokens) public payable {
        // calculate amount out (zero fee)
        // msg.value만큼 빠지는 이유는 이미 컨트랙트에서 해당 함수를 실행하면 이더리움이 넘어온 상태인데
        //address(this).balance를 찍어보면 내가 스왑할 때 입력한 이더리움 개수가 추가되어 있기 때문에
        //내가 이더를 보낸 값만큼 빼야 기존에 있던 풀의 이더리움 양을 얻어올 수 있음
        uint256 outputAmount = getOutputAmount(msg.value, address(this).balance - msg.value, token.balanceOf(address(this)));
        require(outputAmount >= _minTokens, "Inffucient outputamount");
        //transfer token out
        //컨트랙트가 보유중인 토큰을 msg.sender인 사용자에게 전송
        token.transfer(msg.sender, outputAmount);
    }

    // ERC20 -> ETH
    function tokenToEthSwap(uint256 _tokenSold, uint256 _minEth) public payable {
        // calculate amount out (zero fee)
        uint256 outputAmount = getOutputAmount(_tokenSold, token.balanceOf(address(this)), address(this).balance);
        require(outputAmount >= _minEth, "Inffucient outputamount");
        
        //transfer token out
        //해당 주소로 _tokenSold만큼 전송
        token.transferFrom(msg.sender, address(this), _tokenSold);
        payable(msg.sender).transfer(outputAmount);
    }

    function getPrice(uint256 inputReserve, uint256 outputReserve) public pure returns (uint256) {
        uint256 numerator = inputReserve;
        uint256 denominator = outputReserve;
        return numerator / denominator;
    }

    // CPMM 알고리즘
    function getOutputAmount(uint256 inputAmount, uint256 inputReserve, uint256 outputReserve) public pure returns (uint256) {
        uint256 numerator = outputReserve * inputAmount;
        uint256 denominator = inputReserve + inputAmount;
        return numerator / denominator;
    }
}

